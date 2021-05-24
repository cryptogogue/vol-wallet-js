// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as entitlements                from '../util/entitlements';
import { NetworkStateService }          from './NetworkStateService';
import { InventoryService }             from './InventoryService';
import { InventoryTagsController }      from './InventoryTagsController';
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
    @observable transactions    = [];

    @computed get account                   () { return this.accountService.account; }
    @computed get hasTransactionError       () { return Boolean ( this.account.transactionError ); }
    @computed get isLoaded                  () { return this.status === TX_SERVICE_STATUS.LOADED; }

    //----------------------------------------------------------------//
    @computed get
    acceptedTransactions () {
        return this.transactions.filter (( elem ) => { return elem.status === TX_STATUS.ACCEPTED });
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
            this.transactions = this.transactions.filter (( elem ) => { return !elem.isUnsent });
        });
        await this.saveAsync ();
    }

    //----------------------------------------------------------------//
    @action
    clearTransactionError () {
        this.account.transactionError = false;
    }

    //----------------------------------------------------------------//
    @action
    async composeQueueAsync ( restored ) {

        if ( restored.length === 0 ) return;

        const transactionsByNonce = {};
        const stagedOrPending = [];

        for ( let transaction of this.transactions ) {
            if ( transaction.isAccepted || transaction.isLost ) {
                transactionsByNonce [ transaction.nonce ] = transaction;
            }
            else {
                stagedOrPending.push ( transaction );
            }
        }

        for ( let envelope of restored ) {

            const body = JSON.parse ( envelope.body );
            debugLog ( 'TRANSACTION:', body.maker.nonce, body );

            const nonce = body.maker.nonce;

            const existing = transactionsByNonce [ nonce ];
            if ( existing && existing.isAccepted ) continue;

            const transaction = Transaction.fromBody ( body );
            transaction.setEnvelope ( envelope );
            transaction.setStatus ( TX_STATUS.RESTORED );

            transactionsByNonce [ nonce ] = transaction;

             debugLog ( 'TRANSACTION RESTORED:', transaction );
        }

        // transactionsByNonce is now the master list of transactions, not counting staged or pending
        // turn it back into an array

        const firstPendingNonce = ( stagedOrPending.length && stagedOrPending [ 0 ].isPending ) ? stagedOrPending [ 0 ].nonce : false;

        const transactions = [];
        for ( let nonce in transactionsByNonce ) {
            const transaction = transactionsByNonce [ nonce ];
            if ( transaction.nonce === firstPendingNonce ) break;
            transactions.push ( transaction );
        }

        this.transactions = transactions.concat ( stagedOrPending );
        await this.saveAsync ();
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
        return this.transactions.filter (( elem ) => { return ( elem.isPending || elem.isUnsent )});
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
    @action
    async loadAsync () {

        if ( this.status !== TX_SERVICE_STATUS.UNLOADED ) return;

        debugLog ( 'LOADING TRANSACTIONS' );

        const record = await this.db.transactions.get ({ networkID: this.networkService.networkID, accountIndex: this.accountService.index });

        debugLog ( 'LOADING TRANSACTIONS', record );

        runInAction (() => {
            this.transactions = record && record.transactions ? record.transactions : [];

            for ( let i in this.transactions ) {
                this.transactions [ i ] = Transaction.load ( this.transactions [ i ]);
            }
            this.status = TX_SERVICE_STATUS.LOADED;
        });
    }

    //----------------------------------------------------------------//
    @computed get
    lostTransactions () {
        return this.transactions.filter (( elem ) => { return ( elem.status === TX_STATUS.LOST )});
    }

    //----------------------------------------------------------------//
    @computed get
    pendingTransactions () {
        return this.transactions.filter (( elem ) => { return elem.isPending });
    }

    //----------------------------------------------------------------//
    @action
    async processTransactionsAsync () {

        debugLog ( 'processTransactionsAsync' );

        await this.loadAsync ();

        if ( this.hasTransactionError ) return;

        const transaction = this.pendingTransactions [ 0 ];
        if ( !transaction ) {
            await this.restoreTransactionsAsync ();
            return;
        }

        const account           = this.account;
        const consensusService  = this.networkService.consensusService;
        const accountName       = transaction.body.maker.accountName;
        
        debugLog ( 'processTransaction', accountName, toJS ( transaction ));

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

                        for ( let transaction of this.transactions ) {

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
    async restoreTransactionsAsync () {

        debugLog ( 'RESTORE TRANSACTIONS' );

        let downloadNonce = 0;
        for ( let transaction of this.transactions ) {
            if ( !transaction.isAccepted || ( transaction.nonce > downloadNonce )) break;
            downloadNonce++;
        }

        debugLog ( 'DOWNLOAD NONCE', downloadNonce );

        if ( downloadNonce >= this.accountService.nonce ) return;

        const consensusService = this.networkService.consensusService;

        try {
            const serviceURL    = consensusService.getServiceURL ( `/accounts/${ this.accountService.accountID }/history/transactions/${ downloadNonce }` );
            const data          = await this.revocable.fetchJSON ( serviceURL );

            if ( data && data.transactions ) {
                await this.composeQueueAsync ( data.transactions );
            }
        }
        catch ( error ) {
            debugLog ( 'error or no response', error );
        }
    }

    //----------------------------------------------------------------//
    async saveAsync () {
        assert ( this.status === TX_SERVICE_STATUS.LOADED );
        await this.db.transactions.put ({ networkID: this.networkService.networkID, accountIndex: this.accountService.index, transactions: toJS ( this.transactions )});
    }

    //----------------------------------------------------------------//
    @computed get
    stagedTransactions () {
        return this.transactions.filter (( elem ) => { return elem.status === TX_STATUS.STAGED });
    }

    //----------------------------------------------------------------//
    @action
    async stageTransactionAsync ( transaction ) {

        debugLog ( 'stageTransactionAsync', transaction );

        await ( this.loadAsync ());

        transaction.setUUID ();
        transaction.setStatus ( TX_STATUS.STAGED );

        runInAction (() => {
            this.transactions.push ( transaction );
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
            for ( let transaction of this.transactions ) {
                if ( transaction.isAccepted && ( transaction.nonce > nonce )) {
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
        return this.transactions.filter (( elem ) => { return elem.isUnsent });
    }
}
