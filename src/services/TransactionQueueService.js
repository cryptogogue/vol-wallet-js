// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as entitlements                from '../util/entitlements';
import { NetworkStateService }          from './NetworkStateService';
import { InventoryService }             from './InventoryService';
import { InventoryTagsController }      from './InventoryTagsController';
import { InventoryController }          from 'cardmotron';
import { assert, crypto, excel, ProgressController, randomBytes, RevocableContext, SingleColumnContainerView, StorageContext, util } from 'fgc';
import * as bcrypt                      from 'bcryptjs';
import _                                from 'lodash';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import React                            from 'react';

//const debugLog = function () {}
const debugLog = function ( ...args ) { console.log ( '@TX:', ...args ); }

export const TX_STATUS = {

    // undent
    STAGED:             'STAGED',           // gray

    // sent but not accepted
    PENDING:            'PENDING',          // puple
    
    // sent and accepted
    ACCEPTED:           'ACCEPTED',         // green
};

export const TX_SUB_STATUS = {

    // ACCEPTED
    LOCAL:              'LOCAL',
    RESTORED:           'RESTORED',

    // PENDING
    SENT:               'SENT',
    MIXED:              'MIXED',            // yellow
    REJECTED:           'REJECTED',         // red
    STALLED:            'STALLED',          // gray
    LOST:               'LOST',             // yellow
};

export const TX_QUEUE_STATUS = {
    UNLOADED:           'UNLOADED',
    LOADING:            'LOADING',
    LOADED:             'LOADED',
};

//================================================================//
// TransactionQueueService
//================================================================//
export class TransactionQueueService {

    @observable status          = TX_QUEUE_STATUS.UNLOADED;
    @observable transactions    = [];

    @computed get account                   () { return this.accountService.account; }
    @computed get hasTransactionError       () { return Boolean ( this.account.transactionError ); }
    @computed get isLoaded                  () { return this.status === TX_QUEUE_STATUS.LOADED; }

    //----------------------------------------------------------------//
    @computed get
    acceptedTransactions () {
        return this.transactions.filter (( elem ) => { return elem.status === TX_STATUS.ACCEPTED });
    }

    //----------------------------------------------------------------//
    @computed get
    assetsUtilized () {

        let assetsUtilized = [];

        // touch .length to force update if change (mobx)
        const transactions = this.transactions;
        if ( transactions.length ) {
            for ( let transaction of transactions ) {
                if ( transaction.status !== TX_STATUS.ACCEPTED ) {
                    assetsUtilized = assetsUtilized.concat ( transaction.assets );
                }
            }
        }
        return assetsUtilized;
    }

    //----------------------------------------------------------------//
    @computed get
    canClearTransactions () {

        return ( this.unacceptedTransactions.length > 0 );
    }

    //----------------------------------------------------------------//
    @computed get
    canSubmitTransactions () {

        if ( this.accountService.nonce < 0 ) return false;

        if ( this.stagedTransactions.length > 0 ) return true;
        if (( this.pendingTransactions.length > 0 ) && ( this.hasTransactionError )) return true;

        return false;
    }

    //----------------------------------------------------------------//
    @action
    async clearUnacceptedTransactionsAsync () {

        await this.loadAsync ();
        runInAction (() => {
            this.transactions = this.transactions.filter (( elem ) => { return elem.status === TX_STATUS.ACCEPTED });
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

        let transactions = _.cloneDeep ( this.transactions );
        for ( let transaction of transactions ) {
            if ( transaction.status === TX_STATUS.ACCEPTED ) {
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
            if ( transactionsByNonce [ nonce ]) continue;

            transactionsByNonce [ nonce ] = {
                nonce:              nonce,
                type:               body.type,
                note:               '',
                cost:               0,
                body:               body,
                assets:             false,
                uuid:               body.uuid,
                status:             TX_STATUS.ACCEPTED,
                subStatus:          TX_SUB_STATUS.RESTORED,
                miners:             [],
            }
        }

        // transactionsByNonce is now the master list of transactions, not counting staged or pending
        // turn it back into an array

        const firstPendingNonce = ( stagedOrPending.length && stagedOrPending [ 0 ].status === TX_STATUS_PENDING ) ? stagedOrPending [ 0 ].nonce : false;

        transactions = [];
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

        for ( let transaction of this.unacceptedTransactions ) {
            cost += transaction.cost;
        }
        return cost;
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
    @action
    async loadAsync () {

        if ( this.status !== TX_QUEUE_STATUS.UNLOADED ) return;

        debugLog ( 'LOADING TRANSACTIONS' );

        const record = await this.db.transactions.get ({ networkID: this.networkService.networkID, accountIndex: this.accountService.index });

        debugLog ( 'LOADING TRANSACTIONS', record );

        runInAction (() => {
            this.transactions = record && record.transactions ? record.transactions : [];
            this.status = TX_QUEUE_STATUS.LOADED;
        });
    }

    //----------------------------------------------------------------//
    @computed get
    lostTransactions () {
        return this.transactions.filter (( elem ) => { return (( elem.status === TX_STATUS.PENDING ) && ( elem.subStatus === TX_SUB_STATUS.LOST ))});
    }

    //----------------------------------------------------------------//
    @computed get
    nextPendingTransaction () {
        for ( let transaction of this.pendingTransactions ) {
            if (( transaction.subStatus === TX_SUB_STATUS.SENT ) || ( transaction.subStatus === TX_SUB_STATUS.MIXED )) return transaction;
        }
        return false;
    }

    //----------------------------------------------------------------//
    @computed get
    pendingTransactions () {
        return this.transactions.filter (( elem ) => { return elem.status === TX_STATUS.PENDING });
    }

    //----------------------------------------------------------------//
    @action
    async processTransactionsAsync () {

        debugLog ( 'processTransactionsAsync' );

        await this.loadAsync ();

        if ( this.hasTransactionError ) return;

        const transaction = this.nextPendingTransaction;
        if ( !transaction ) {
            await this.restoreTransactionsAsync ();
            return;
        }

        const account           = this.account;
        const consensusService  = this.networkService.consensusService;
        const accountName       = transaction.body.maker.accountName;
        
        debugLog ( 'processTransaction', accountName, _.cloneDeep ( transaction ));

        let responseCount = 0;
        let acceptedCount = 0;
        let rejectedCount = 0;

        let rejected = [];

        const checkTransactionStatus = async ( minerURL ) => {

            const serviceURL = consensusService.formatServiceURL ( minerURL, `/accounts/${ accountName }/transactions/${ transaction.uuid }` );

            if ( !transaction.miners.includes ( minerURL )) {
                debugLog ( 'submitting tx to:', minerURL );
                if ( await this.putTransactionAsync ( serviceURL, transaction )) {
                    runInAction (() => {
                        transaction.miners.push ( minerURL );
                    });
                }
                return;
            }

            debugLog ( 'processTransaction checkTransactionStatus', minerURL );

            try {
                const response = await this.revocable.fetchJSON ( serviceURL );
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

            // if *all* nodes have accepted the transaction, remove it from the queue and advance.
            if ( acceptedCount === responseCount ) {

                debugLog ( 'accepted' );

                runInAction (() => {

                    const assetsSent = _.clone ( account.assetsSent || {});
                    for ( let assetID of transaction.assets ) {
                        assetsSent [ assetID ] = assetID;
                    }

                    transaction.status      = TX_STATUS.ACCEPTED;
                    transaction.subStatus   = TX_SUB_STATUS.LOCAL;
                    transaction.miners      = false;
                    account.assetsSent      = assetsSent;
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
                        transaction.subStatus = TX_SUB_STATUS.REJECTED;
                    });
                }
                else {
                    runInAction (() => {
                        transaction.subStatus = TX_SUB_STATUS.MIXED;
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

        let downloadNonce = 0;
        for ( let transaction of this.transactions ) {

            if ( downloadNonce >= this.accountService.nonce ) return;

            if (( transaction.status !== TX_STATUS.ACCEPTED ) || ( transaction.nonce > downloadNonce )) break;
            downloadNonce++;
        }

        if ( downloadNonce === false ) return;

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

        assert ( this.status === TX_QUEUE_STATUS.LOADED );
        await this.db.transactions.put ({ networkID: this.networkService.networkID, accountIndex: this.accountService.index, transactions: _.cloneDeep ( this.transactions )});
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

        const memo = {
            type:               transaction.type,
            note:               transaction.note,
            cost:               transaction.getCost (),
            body:               transaction.body,
            assets:             transaction.assetsUtilized,
            uuid:               util.generateUUIDV4 (),
            status:             TX_STATUS.STAGED,
            miners:             [],
        }

        runInAction (() => {
            this.transactions.push ( memo );
            this.appState.flags.promptFirstTransaction = false;
        });

        await this.saveAsync ();
    }

    //----------------------------------------------------------------//
    @action
    async submitTransactionsAsync ( password, nonce ) {

        debugLog ( 'submitTransactions' );

        await this.loadAsync ();

        const hasLostTransactions = this.hasLostTransactions;
        await this.tagLostTransactionsAsync ( nonce );
        if ( !hasLostTransactions && this.hasLostTransactions ) return;

        this.appState.assertPassword ( password );

        this.clearTransactionError ();

        const recordBy = new Date ();
        recordBy.setTime ( recordBy.getTime () + ( 8 * 60 * 60 * 1000 )); // yuck

        for ( let transaction of this.unacceptedTransactions ) {

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
        body.uuid               = transaction.uuid;
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
        transaction.nonce       = body.maker.nonce;
        transaction.status      = TX_STATUS.PENDING;
        transaction.subStatus   = TX_SUB_STATUS.SENT;
        transaction.miners      = [];
    }

    //----------------------------------------------------------------//
    @action
    async tagLostTransactionsAsync ( nonce ) {

        await this.loadAsync ();

        let needsSave = false;

        runInAction (() => {
            for ( let transaction of this.transactions ) {
                if (( transaction.status === TX_STATUS.ACCEPTED ) && ( transaction.nonce >= nonce )) {
                    transaction.status      = TX_STATUS.PENDING;
                    transaction.subStatus   = TX_SUB_STATUS.LOST;
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
    unacceptedTransactions () {
        return this.transactions.filter (( elem ) => { return elem.status !== TX_STATUS.ACCEPTED });
    }
}
