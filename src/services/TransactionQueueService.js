// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as entitlements                from '../util/entitlements';
import { NetworkStateService }          from './NetworkStateService';
import { InventoryService }             from './InventoryService';
import { Transaction, TX_STATUS }       from '../transactions/Transaction';
import { Inventory }                    from 'cardmotron';
import { assert, crypto, excel, ProgressController, randomBytes, RevocableContext, SingleColumnContainerView, StorageContext, util } from 'fgc';
import * as bcrypt                      from 'bcryptjs';
import _                                from 'lodash';
import { action, computed, extendObservable, observable, observe, runInAction, toJS } from 'mobx';
import React                            from 'react';

//const debugLog = function () {}
const debugLog = function ( ...args ) { console.log ( '@TX:', ...args ); }

export const TX_SERVICE_STATUS = {
    UNLOADED:           'UNLOADED',
    LOADING:            'LOADING',
    LOADED:             'LOADED',
};

//================================================================//
// TransactionQueueService
//================================================================//
export class TransactionQueueService {

    @observable status          = TX_SERVICE_STATUS.UNLOADED;
    @observable history         = [];
    @observable queue           = [];

    @computed get account                   () { return this.accountService.account; }
    @computed get hasTransactionError       () { return Boolean ( this.account.transactionError ); }
    @computed get isLoaded                  () { return this.status === TX_SERVICE_STATUS.LOADED; }

    //----------------------------------------------------------------//
    @computed get
    acceptedTransactions () {
        return this.queue.filter (( elem ) => { return elem.status === TX_STATUS.ACCEPTED });
    }

    //----------------------------------------------------------------//
    @computed get
    accountQueueHistory () {

        const transactions = [];
        for ( let entry of this.history ) {
            const transaction = entry.transaction;
            if ( transaction.makerIndex === this.accountService.index ) {
                transactions.push ( transaction );
            }
        }
        return transactions;
    }

    //----------------------------------------------------------------//
    @computed get
    assetsFiltered () {

        const assetsFiltered = {};

        for ( let transaction of this.costBearingTransactions ) {
            _.assign ( assetsFiltered, transaction.assetsFiltered );
        }
        return assetsFiltered;
    }

    //----------------------------------------------------------------//
    @action
    async clearUnsentTransactionsAsync () {

        this.clearTransactionError ();

        await this.loadAsync ();
        runInAction (() => {
            this.queue = this.queue.filter (( elem ) => { return !elem.isUnsent });
        });
        await this.saveAsync ();
    }

    //----------------------------------------------------------------//
    @action
    clearTransactionError () {
        this.account.transactionError = false;
    }

    //----------------------------------------------------------------//
    constructor ( accountService ) {
        
        this.revocable          = new RevocableContext ();
        this.accountService     = accountService;
        this.networkService     = accountService.networkService;
        this.appState           = accountService.appState;

        this.appDB              = this.appState.appDB;
        this.db                 = this.appDB.db;
    }

    //----------------------------------------------------------------//
    @computed get
    cost () {

        let cost = 0;

        for ( let transaction of this.costBearingTransactions ) {
            cost += transaction.cost;
        }
        return cost;
    }

    //----------------------------------------------------------------//
    @computed get
    costBearingTransactions () {
        return this.queue.filter (( elem ) => { return ( elem.isPending || elem.isUnsent )});
    }

    //----------------------------------------------------------------//
    @action
    async extendHistoryAsync ( entries ) {

        if ( !entries.length ) return;

        for ( let entry of entries ) {

            let envelope = entry.transaction;

            const body                  = JSON.parse ( envelope.body );
            const transaction           = Transaction.fromBody ( body );

            transaction.setEnvelope ( envelope );
            transaction.setStatus ( TX_STATUS.HISTORY );
            
            transaction.makerIndex      = envelope.makerIndex;
            transaction.details         = envelope.details;

            this.history.push ({
                time:               entry.time,
                blockHeight:        entry.blockHeight,
                transaction:        transaction,
            });
        }

        await this.db.transactionHistory.put ({ networkID: this.networkService.networkID, accountIndex: this.accountService.index, entries: toJS ( this.history )});
    }

    //----------------------------------------------------------------//
    async fetchHistoryAsync () {

        const consensusService = this.networkService.consensusService;

        let more = true;
        while ( more ) {

            more = false;

            try {
                const serviceURL    = consensusService.getServiceURL ( `/accounts/${ this.accountService.accountID }/log`, { base: this.history.length });
                const data          = await this.revocable.fetchJSON ( serviceURL );

                if ( data && data.entries ) {

                    if ( data.logSize < this.history.length ) {
                        await this.resetHistoryAsync ();
                        more = true;
                    }
                    else if ( data.entries.length ) {
                        await this.extendHistoryAsync ( data.entries );
                        more = true;
                    }
                }
            }
            catch ( error ) {
                debugLog ( 'error or no response', error );
            }
        }
    }

    //----------------------------------------------------------------//
    finalize () {

        this.revocable.finalize ();
    }

    //----------------------------------------------------------------//
    @action
    async findNonceAsync ( accountID ) {

        debugLog ( 'findNonceAsync' );

        const consensusService = this.networkService.consensusService;

        const findNonceInner = async () => {

            const nonces = [];

            const checkNonce = async ( minerURL ) => {

                debugLog ( 'checkNonce', minerURL );

                try {
                    const serviceURL = consensusService.formatServiceURL ( minerURL, `/accounts/${ accountID }`, undefined, undefined, true );

                    debugLog ( 'serviceURL', serviceURL );

                    const result = await this.revocable.fetchJSON ( serviceURL );

                    if ( result && result.account ) {
                        debugLog ( 'push nonce', result.account.nonce );
                        nonces.push ( result.account.nonce );
                    }
                }
                catch ( error ) {
                    debugLog ( 'error or no response', error );
                }
            }

            const promises = [];
            const miners = consensusService.currentMiners;
            debugLog ( JSON.stringify ( miners, null, 4 ));

            for ( let miner of miners ) {
                promises.push ( checkNonce ( miner.url ));
            }
            await this.revocable.all ( promises );

            debugLog ( 'nonces', nonces );
            debugLog ( 'promise count', promises.length );
            debugLog ( 'every', nonces.every ( n => n === nonces [ 0 ]));

            return ( nonces.length && ( nonces.length === promises.length ) && nonces.every ( n => n === nonces [ 0 ])) ? nonces [ 0 ] : false;
        }

        for ( let i = 0; i < 4; ++i ) {
            const nonce = await findNonceInner ();
            if ( nonce === this.accountService.nonce ) return nonce; 
        }
        return false;
    }

    //----------------------------------------------------------------//
    @computed get
    hasLostTransactions () {
        return this.lostTransactions.length > 0;
    }

    //----------------------------------------------------------------//
    @computed get
    hasUnsentTransactions () {
        return ( this.unsentTransactions.length > 0 );
    }

    //----------------------------------------------------------------//
    @computed get
    inboxUnread () {

        const inboxBase = this.accountService.inboxRead;
        let count = 0;

        for ( let i = inboxBase; i < this.history.length; ++i ) {
            const tx = this.history [ i ].transaction;
            if ( tx.makerIndex !== this.accountService.index ) count++;
        }
        return count;
    }

    //----------------------------------------------------------------//
    @action
    async loadAsync () {

        if ( this.status !== TX_SERVICE_STATUS.UNLOADED ) return;

        const queueRecord       = await this.db.transactionQueue.get ({ networkID: this.networkService.networkID, accountIndex: this.accountService.index });
        const historyRecord     = await this.db.transactionHistory.get ({ networkID: this.networkService.networkID, accountIndex: this.accountService.index });

        runInAction (() => {
            
            this.queue = queueRecord && queueRecord.transactions ? queueRecord.transactions : [];
            for ( let i in this.queue ) {
                this.queue [ i ] = Transaction.load ( this.queue [ i ]);
            }

            this.history = historyRecord && historyRecord.entries ? historyRecord.entries : [];
            for ( let i in this.history ) {
                this.history [ i ].transaction = Transaction.load ( this.history [ i ].transaction );
            }

            this.status = TX_SERVICE_STATUS.LOADED;
        });
    }

    //----------------------------------------------------------------//
    @computed get
    lostTransactions () {
        return this.queue.filter (( elem ) => { return ( elem.status === TX_STATUS.LOST )});
    }

    //----------------------------------------------------------------//
    @computed get
    pendingTransactions () {
        return this.queue.filter (( elem ) => { return elem.isPending });
    }

    //----------------------------------------------------------------//
    @action
    async processTransactionsAsync () {

        await this.loadAsync ();
        await this.fetchHistoryAsync ();
        await this.restoreTransactionsAsync ();

        if ( this.hasTransactionError ) return;

        const transaction = this.pendingTransactions [ 0 ];
        if ( !transaction ) return;

        const account           = this.account;
        const consensusService  = this.networkService.consensusService;
        const accountName       = transaction.body.maker.accountName;
        
        let responseCount = 0;
        let acceptedCount = 0;
        let rejectedCount = 0;

        let rejected = [];

        if ( transaction.miners.length === 0 ) {
            transaction.setStatus ( TX_STATUS.SENT );
        }

        const checkTransactionStatus = async ( minerURL ) => {

            const serviceURL = consensusService.formatServiceURL ( minerURL, `/accounts/${ accountName }/transactions/${ transaction.uuid }` );

            if ( !transaction.miners.includes ( minerURL )) {
                debugLog ( 'submitting tx to:', minerURL );
                if ( await this.putTransactionAsync ( serviceURL, transaction )) {
                    transaction.affirmMiner ( minerURL );
                }
                return;
            }

            debugLog ( 'processTransaction checkTransactionStatus', minerURL );

            try {
                const response = await this.revocable.fetchJSON ( serviceURL, undefined, 10000 );
                debugLog ( 'response:', response );
                
                responseCount++;

                switch ( response.status ) {

                    case 'ACCEPTED':
                        acceptedCount++;
                        break;

                    case 'REJECTED':
                    case 'IGNORED':
                        rejectedCount++;
                        rejected.push ( response );
                        break;

                    case 'UNKNOWN':
                        // re-send the transaction if not recognized.
                        await this.putTransactionAsync ( serviceURL, transaction );
                        break;

                    default:
                        break;
                }
            }
            catch ( error ) {
                debugLog ( 'error or no response' );
            }
        }

        // check status of transaction on them all.
        const promises = [];
        const miners = consensusService.currentMiners;
        for ( let miner of miners ) {
            promises.push ( checkTransactionStatus ( miner.url ));
        }
        await this.revocable.all ( promises );

        if ( responseCount ) {

            debugLog ( 'RESPONSE COUNT:', responseCount );
            debugLog ( 'ACCEPTED COUNT:', acceptedCount );
            debugLog ( 'REJECTED COUNT:', rejectedCount );
            debugLog ( 'RESPONSE COUNT:', responseCount );
            debugLog ( 'NONCE:', transaction.nonce );
            debugLog ( 'ACCOUNT NONCE:', this.accountService.nonce );

            transaction.setAcceptedCount ( acceptedCount );

            // if *all* nodes have accepted the transaction, remove it from the queue and advance.
            if ( transaction.nonce < this.accountService.nonce ) {

                runInAction (() => {

                    const assetsFiltered = _.clone ( account.assetsFiltered || {});
                    for ( let assetID in transaction.assetsFiltered ) {
                        assetsFiltered [ assetID ] = transaction.assetsFiltered [ assetID ];
                    }

                    transaction.setStatus ( TX_STATUS.ACCEPTED );
                    transaction.clearMiners ();

                    account.assetsFiltered = assetsFiltered;
                });
            }

            // if *all* nodes have rejected the transaction, stop and report.
            if ( rejectedCount ) {
                if ( rejectedCount === responseCount ) {
                    runInAction (() => {
                        account.transactionError = {
                            message:    rejected [ 0 ].message,
                            uuid:       rejected [ 0 ].uuid,
                        };
                        transaction.setStatus ( TX_STATUS.REJECTED );

                        for ( let transaction of this.queue ) {

                            if ( transaction.status === TX_STATUS.REJECTED ) continue;

                            if ( transaction.isPending || transaction.isUnsent ) {
                                transaction.setStatus ( TX_STATUS.BLOCKED );
                            }
                        }
                    });
                }
                else {
                    runInAction (() => {
                        transaction.setStatus ( TX_STATUS.MIXED );
                    });
                }
            }
        }

        await this.saveAsync ();
    }

    //----------------------------------------------------------------//
    async putTransactionAsync ( serviceURL, transaction ) {

        debugLog ( 'putTransactionsAsync', transaction );

        let result = false;

        try {
            result = await this.revocable.fetchJSON ( serviceURL, {
                method :    'PUT',
                headers :   { 'content-type': 'application/json' },
                body :      JSON.stringify ( transaction.envelope, null, 4 ),
            });
        }
        catch ( error ) {
            debugLog ( 'error or no response' );
            debugLog ( error );
        }

        return ( result && ( result.status === 'OK' ));
    }

    //----------------------------------------------------------------//
    @action
    async resetHistoryAsync () {

        this.history = [];
        await this.db.transactionHistory.put ({ networkID: this.networkService.networkID, accountIndex: this.accountService.index, entries: toJS ( this.history )});
    }

    //----------------------------------------------------------------//
    @action
    async restoreTransactionsAsync () {

        const history = this.accountQueueHistory;
        const length = history.length < this.queue.length ? this.queue.length : history.length;

        for ( let i = 0; i < length; ++i ) {

            const txFromQueue       = this.queue [ i ];
            const txFromHistory     = history [ i ];

            assert ( txFromQueue || txFromHistory );

            // if there's a tx from the queue, don't overwrite it
            if ( txFromQueue ) continue;

            // tx from history; overwrite
            if ( txFromHistory ) {

                const transaction = _.cloneDeep ( txFromHistory );
                assert ( transaction instanceof Transaction );

                transaction.setStatus ( TX_STATUS.RESTORED );
                this.queue [ i ] = transaction;
            }
        }

        await this.saveAsync ();
    }

    //----------------------------------------------------------------//
    async saveAsync () {
        assert ( this.status === TX_SERVICE_STATUS.LOADED );
        await this.db.transactionQueue.put ({ networkID: this.networkService.networkID, accountIndex: this.accountService.index, transactions: toJS ( this.queue )});
    }

    //----------------------------------------------------------------//
    @computed get
    stagedTransactions () {
        return this.queue.filter (( elem ) => { return elem.status === TX_STATUS.STAGED });
    }

    //----------------------------------------------------------------//
    @action
    async stageTransactionAsync ( transaction ) {

        debugLog ( 'stageTransactionAsync', transaction );

        await ( this.loadAsync ());

        transaction.setUUID ();
        transaction.setStatus ( TX_STATUS.STAGED );

        runInAction (() => {
            this.queue.push ( transaction );
            this.appState.flags.promptFirstTransaction = false;
        });

        await this.saveAsync ();
    }

    //----------------------------------------------------------------//
    @action
    async submitTransactionsAsync ( password, nonce ) {

        debugLog ( 'submitTransactions' );

        await this.loadAsync ();

        this.appState.assertPassword ( password );

        this.clearTransactionError ();

        const recordBy = new Date ();
        recordBy.setTime ( recordBy.getTime () + ( 8 * 60 * 60 * 1000 )); // yuck

        for ( let transaction of this.unsentTransactions ) {

            const hexKey            = this.account.keys [ transaction.body.maker.keyName ];
            const privateKeyHex     = crypto.aesCipherToPlain ( hexKey.privateKeyHexAES, password );
            const key               = await crypto.keyFromPrivateHex ( privateKeyHex );

            this.submitTransactionsWithKeyAndNonce ( transaction, key, recordBy, nonce++ );
        }

        await this.saveAsync ();
    }

    //----------------------------------------------------------------//
    @action
    submitTransactionsWithKeyAndNonce ( transaction, key, recordBy, nonce ) {

        let body                = transaction.body;
        body.maxHeight          = 0; // don't use for now
        body.recordBy           = recordBy.toISOString ();
        body.maker.nonce        = nonce;

        let envelope = {
            body: JSON.stringify ( body ),
        };

        envelope.signature = {
            hashAlgorithm:  'SHA256',
            signature:      key.sign ( envelope.body ),
        };

        transaction.envelope    = envelope;
        transaction.status      = TX_STATUS.PENDING;
        transaction.miners      = [];
    }

    //----------------------------------------------------------------//
    @action
    async tagLostTransactionsAsync ( nonce ) {

        await this.loadAsync ();

        let needsSave = false;

        runInAction (() => {
            for ( let transaction of this.queue ) {
                if ( transaction.isAccepted && ( transaction.nonce >= nonce )) {
                    transaction.status      = TX_STATUS.LOST;
                    needsSave               = true;
                }
            }
        });

        if ( needsSave ) {
            await this.saveAsync ();
        }
    }

    //----------------------------------------------------------------//
    @computed get
    transactionError () {
        return this.account.transactionError || false;
    }

    //----------------------------------------------------------------//
    @computed get
    unsentTransactions () {
        return this.queue.filter (( elem ) => { return elem.isUnsent });
    }
}
