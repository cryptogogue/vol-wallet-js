// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as AppDB                               from './AppDB';
import { Transaction, TRANSACTION_TYPE }        from '../transactions/Transaction';
import { TransactionHistoryEntry }              from '../transactions/TransactionHistoryEntry';
import { TransactionQueueEntry, TX_MINER_STATUS, TX_QUEUE_STATUS, TX_STATUS } from '../transactions/TransactionQueueEntry';
import { assert, crypto, RevocableContext }     from 'fgc';
import _                                        from 'lodash';
import { action, computed, observable, runInAction, toJS } from 'mobx';
import * as vol                                 from 'vol';

//const debugLog = function () {}
const debugLog = function ( ...args ) { console.log ( '@TX:', ...args ); }

export const TX_SERVICE_STATUS = {
    UNLOADED:           'UNLOADED',
    LOADING:            'LOADING',
    LOADED:             'LOADED',
};

const TX_MINER_TIMEOUT      = 10000;
const TX_HISTORY_VERSION    = 1;

// there are *three* tables of tx info in the database.
//      1. transactionQueue: this is the tx queue itself. it's a monolithic serialization of the entire queue.
//      2. transactionHistory: this is the account log, downloaded from the network. it's a monolithic serialization of the entire account log.
//      3. transactions: this is the database of tx bodies/envelopes. each tx body is stored individually. when a tx is submitted or restored, its body is replace with an envelope.

//================================================================//
// TransactionQueueService
//================================================================//
export class TransactionQueueService {

    @observable status          = TX_SERVICE_STATUS.UNLOADED;
    @observable history         = [];
    @observable queue           = [];

    @computed get account                   () { return this.accountService.account; }
    @computed get hasTransactionError       () { return this.accountService.hasTransactionError; }
    @computed get hasUnsentTransactions     () { return ( this.unsentQueue.length > 0 ); }
    @computed get isLoaded                  () { return this.status === TX_SERVICE_STATUS.LOADED; }
    @computed get transactionError          () { return this.account.transactionError || false; }
    
    @computed get costBearingQueue          () { return this.queue.filter (( elem ) => { return ( elem.isPending || elem.isUnsent )}); }
    @computed get pendingQueue              () { return this.queue.filter (( elem ) => { return elem.isPending }); }
    @computed get stagedQueue               () { return this.queue.filter (( elem ) => { return elem.status === TX_STATUS.STAGED }); }
    @computed get unsentQueue               () { return this.queue.filter (( elem ) => { return elem.isUnsent }); }

    @computed get accountQueueHistory       () { return this.history.filter (( entry ) => { return entry.isMaker }); }

    //----------------------------------------------------------------//
    @computed get
    assetsFiltered () {

        const assetsFiltered = {};

        for ( let queueEntry of this.costBearingQueue ) {
            _.assign ( assetsFiltered, queueEntry.assetsFiltered );
        }
        return assetsFiltered;
    }

    //----------------------------------------------------------------//
    @action
    async clearAndResetAsync () {

        this.setTransactionError ();

        await this.loadAsync ();
        runInAction (() => {
            this.queue          = [];
            this.history        = [];
            this.status         = TX_SERVICE_STATUS.UNLOADED;
        });
        await AppDB.putAsync ( 'transactionQueue', { networkID: this.networkService.networkID, accountIndex: this.accountService.index, transactions: []});
        await AppDB.putAsync ( 'transactionHistory', { networkID: this.networkService.networkID, accountIndex: this.accountService.index, entries: [], version: TX_HISTORY_VERSION });
        await AppDB.deleteWhereAsync ( 'transactions', { networkID: this.networkService.networkID, accountIndex: this.accountService.index });
    }

    //----------------------------------------------------------------//
    @action
    async clearUnsentTransactionsAsync () {

        this.setTransactionError ();

        await this.loadAsync ();
        runInAction (() => {
            this.queue = this.queue.filter (( elem ) => { return !elem.isUnsent });
        });
        await this.saveAsync ();
    }

    //----------------------------------------------------------------//
    constructor ( accountService ) {
        
        this.revocable          = new RevocableContext ();
        this.accountService     = accountService;
        this.networkService     = accountService.networkService;
        this.consensusService   = this.networkService.consensusService;
        this.appState           = accountService.appState;
    }

    //----------------------------------------------------------------//
    @computed get
    cost () {

        let cost = 0;

        for ( let queueEntry of this.costBearingQueue ) {
            cost += queueEntry.cost;
        }
        return cost;
    }

    //----------------------------------------------------------------//
    @action
    async extendHistoryAsync ( entries ) {

        if ( !entries.length ) return;

        for ( let entry of entries ) {
 
            const historyEntry = TransactionHistoryEntry.fromAccountLogEntry ( this.accountService.index, entry );

            runInAction (() => {
                this.history.push ( historyEntry );
            });

            const envelope = _.cloneDeep ( entry.transaction );
            delete envelope.makerIndex;
            delete envelope.details;

            await AppDB.putAsync ( 'transactions', { networkID: this.networkService.networkID, accountIndex: this.accountService.index, uuid: historyEntry.uuid, envelope: envelope });
        }

        await AppDB.putAsync ( 'transactionHistory', { networkID: this.networkService.networkID, accountIndex: this.accountService.index, entries: toJS ( this.history ), version: TX_HISTORY_VERSION });
    }

    //----------------------------------------------------------------//
    async fetchHistoryAsync () {

        const consensusService = this.consensusService;
        if ( !consensusService.isOnline ) return;

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
    async getTransactionBodyAsync ( uuid ) {

        const transactionRow = await AppDB.getAsync ( 'transactions', { networkID: this.networkService.networkID, accountIndex: this.accountService.index, uuid: uuid });
        return transactionRow && (( transactionRow.envelope && JSON.parse ( transactionRow.envelope.body )) || transactionRow.body ) || {};
    }

    //----------------------------------------------------------------//
    async getTransactionEnvelopeAsync ( uuid ) {
        const transactionRow = await AppDB.getAsync ( 'transactions', { networkID: this.networkService.networkID, accountIndex: this.accountService.index, uuid: uuid });
        assert ( transactionRow.envelope );
        return transactionRow.envelope;
    }

    //----------------------------------------------------------------//
    @computed get
    inboxUnread () {

        const inboxBase = this.accountService.inboxRead;
        let count = 0;

        for ( let i = inboxBase; i < this.history.length; ++i ) {
            const entry = this.history [ i ];
            if ( entry.makerIndex !== this.accountService.index ) count++;
        }
        return count;
    }

    //----------------------------------------------------------------//
    @action
    async loadAsync () {

        if ( this.status !== TX_SERVICE_STATUS.UNLOADED ) return;

        debugLog ( 'TX QUEUE LOAD ASYNC' );

        const queueRecord       = await AppDB.getAsync ( 'transactionQueue', { networkID: this.networkService.networkID, accountIndex: this.accountService.index });
        let historyRecord       = await AppDB.getAsync ( 'transactionHistory', { networkID: this.networkService.networkID, accountIndex: this.accountService.index });

        if ( historyRecord && ( historyRecord.version !== TX_HISTORY_VERSION )) {
            await this.resetHistoryAsync ();
            historyRecord = false;
        }

        runInAction (() => {
            
            this.queue = queueRecord && queueRecord.transactions ? queueRecord.transactions : [];
            for ( let i in this.queue ) {
                this.queue [ i ] = TransactionQueueEntry.load ( this.queue [ i ]);
            }

            this.history = historyRecord && historyRecord.entries ? historyRecord.entries : [];
            for ( let i in this.history ) {
                this.history [ i ] = TransactionHistoryEntry.load ( this.history [ i ]);
            }

            this.status = TX_SERVICE_STATUS.LOADED;
        });

        debugLog ( 'TX QUEUE LOADED' );
    }

    //----------------------------------------------------------------//
    @computed get
    pendingOfferIDs () {

        const offerIDs = [];
        for ( let queueEntry of this.costBearingQueue ) {
            if ( queueEntry.offerID !== false ) {
                offerIDs.push ( queueEntry.offerID );
            }
        }
        return offerIDs;
    }    

    //----------------------------------------------------------------//
    @action
    async processMinerAsync ( queueEntry, miner, loadEnvelopeAsync ) {

        const minerID       = miner.minerID;
        const minerURL      = miner.url;

        debugLog ( 'process miner', minerID, minerURL );

        queueEntry.affirmMiner ( minerID );

        if ( queueEntry.getMinerStatus ( minerID ) === TX_MINER_STATUS.REJECTED ) return;
        if ( queueEntry.getMinerBusy ( minerID )) return;

        const submitCount = queueEntry.submitCount;
        queueEntry.setMinerBusy ( minerID, true );

        const serviceURL = this.consensusService.formatServiceURL ( minerURL, `/accounts/${ queueEntry.accountName }/transactions/${ queueEntry.uuid }` );

        const putTransactionAsync = async () => {

            debugLog ( 'submitting transaction', minerID, queueEntry.uuid );

            // re-send the transaction if not recognized.
            const envelope = await loadEnvelopeAsync ();
            const result = await this.revocable.fetchJSON ( serviceURL, {
                method :    'PUT',
                headers :   { 'content-type': 'application/json' },
                body :      JSON.stringify ( envelope, null, 4 ),
            }, TX_MINER_TIMEOUT );

            if ( queueEntry.submitCount !== submitCount ) return;

            if ( result && ( result.status === 'OK' )) {
                queueEntry.setMinerStatus ( minerID, TX_MINER_STATUS.ACCEPTED );
            }
        }

        try {
            
            if ( queueEntry.getMinerStatus ( minerID ) === TX_MINER_STATUS.NEW ) {
                await putTransactionAsync ();
            }
            else {

                debugLog ( 'checking transaction', minerID, queueEntry.uuid );
                const response = await this.revocable.fetchJSON ( serviceURL, undefined, TX_MINER_TIMEOUT );
                if ( queueEntry.submitCount !== submitCount ) return;

                debugLog ( 'RESPONSE:', response );

                switch ( response.status ) {

                    case 'ACCEPTED':
                        
                        queueEntry.setMinerStatus ( minerID, TX_MINER_STATUS.ACCEPTED );
                        break;

                    case 'REJECTED':
                    case 'IGNORED':
                        
                        if ( response.uuid === queueEntry.uuid ) {
                            queueEntry.setMinerStatus ( minerID, TX_MINER_STATUS.REJECTED );
                            queueEntry.setRejection ( response );
                        }
                        break;

                    case 'UNKNOWN': {

                        // re-submit
                        await putTransactionAsync ();
                        break;
                    }
                }
            }
        }
        catch ( error ) {
            debugLog ( error );
            if ( queueEntry.submitCount !== submitCount ) return;
            if ( queueEntry.getMinerStatus ( minerID ) === TX_MINER_STATUS.NEW ) { 
                queueEntry.setMinerStatus ( minerID, TX_MINER_STATUS.TIMED_OUT );
            }
        }

        queueEntry.setMinerBusy ( minerID, false );
    }

    //----------------------------------------------------------------//
    @action
    async processQueueEntry ( queueEntry ) {

        if ( this.hasTransactionError ) return;
        if ( !queueEntry.isPending ) return;

        const consensusService  = this.consensusService;
        const accountName       = queueEntry.accountName;
        
        if ( !consensusService.isOnline ) return;

        if ( queueEntry.status === TX_STATUS.PENDING ) {
            queueEntry.setStatus ( TX_STATUS.SENDING );
        }

        let envelope = false;
        const lazyLoadEnvelopeAsync = async () => {
            envelope = envelope || await this.getTransactionEnvelopeAsync ( queueEntry.uuid );
            return envelope;
        }

        // send transaction to all online miners
        const miners = consensusService.onlineMiners;
        for ( let miner of miners ) {
            this.processMinerAsync ( queueEntry, miner, lazyLoadEnvelopeAsync );
        }

        const responseCount = queueEntry.respondingMiners.length;
        const rejectCount   = queueEntry.rejectingMiners.length;

        // if we got any responses, do something
        if ( responseCount ) {

            // if there were rejections, do something
            if ( rejectCount ) {

                if ( rejectCount === responseCount ) {

                    const rejection = queueEntry.rejection;
                    this.setTransactionError ( rejection.uuid, rejection.message );
                    queueEntry.setStatus ( TX_STATUS.REJECTED );

                    for ( let queueEntry of this.queue ) {
                        if (( queueEntry.isPending || queueEntry.isUnsent ) && ( queueEntry.status !== TX_STATUS.REJECTED )) {
                            queueEntry.setStatus ( TX_STATUS.BLOCKED );
                        }
                    }
                }
                else {
                    queueEntry.setStatus ( TX_STATUS.MIXED );
                }
            }
            else {
                queueEntry.setStatus ( TX_STATUS.SENDING );
            }
        }
    }

    //----------------------------------------------------------------//
    @action
    async resetHistoryAsync () {

        this.history = [];
        await AppDB.putAsync ( 'transactionHistory', { networkID: this.networkService.networkID, accountIndex: this.accountService.index, entries: toJS ( this.history ), version: TX_HISTORY_VERSION });
    }

    //----------------------------------------------------------------//
    @action
    async restoreQueueAsync () {

        const queue     = this.queue;
        const history   = this.accountQueueHistory;
        const length    = history.length < queue.length ? queue.length : history.length;

        const historyEntriesByNonce = {};

        for ( let i = 0; i < length; ++i ) {

            const queueEntry        = ( i < queue.length ) ? queue [ i ] : false;
            const historyEntry      = ( i < history.length ) ? history [ i ] : false;

            assert ( queueEntry || historyEntry );

            if ( historyEntry ) {
                historyEntriesByNonce [ historyEntry.nonce ] = historyEntry;
            }

            // if there's a tx from the queue, don't overwrite it
            if ( queueEntry ) continue;

            // tx from history; overwrite
            debugLog ( 'restoring transaction', historyEntry.type );
            this.queue [ i ] = TransactionQueueEntry.fromTransactionHistoryEntry ( historyEntry );
        }

        // clean up any duplicated nonces
        this.queue = this.queue.filter (( queueEntry ) => {
            if ( !_.has ( historyEntriesByNonce, queueEntry.nonce )) return true;
            return queueEntry.uuid === historyEntriesByNonce [ queueEntry.nonce ].uuid;
        });

        await this.saveAsync ();
    }

    //----------------------------------------------------------------//
    async saveAsync () {
        assert ( this.status === TX_SERVICE_STATUS.LOADED );
        await AppDB.putAsync ( 'transactionQueue', { networkID: this.networkService.networkID, accountIndex: this.accountService.index, transactions: toJS ( this.queue )});
    }

    //----------------------------------------------------------------//
    @action
    async serviceStepAsync () {

        await this.loadAsync ();
        await this.fetchHistoryAsync ();
        await this.updateQueueStatusAsync ();
        await this.restoreQueueAsync ();

        if ( this.hasTransactionError ) return;

        for ( let queueEntry of this.pendingQueue ) {
            this.processQueueEntry ( queueEntry );
        }

        await this.saveAsync ();
    }

    //----------------------------------------------------------------//
    setTransactionError ( uuid, message ) {
        this.accountService.setTransactionError ( uuid, message );
    }

    //----------------------------------------------------------------//
    @action
    async stageTransactionAsync ( transaction ) {

        debugLog ( 'stageTransactionAsync', transaction );

        await ( this.loadAsync ());

        transaction.setUUID ();
        const body = _.cloneDeep ( transaction.body );

        const queueEntry = TransactionQueueEntry.fromTransaction ( transaction );

        await AppDB.putAsync ( 'transactions', { networkID: this.networkService.networkID, accountIndex: this.accountService.index, uuid: queueEntry.uuid, body: body });

        runInAction (() => {
            this.queue.push ( queueEntry );
            this.appState.flags.promptFirstTransaction = false;
        });

        await this.saveAsync ();
    }

    //----------------------------------------------------------------//
    @action
    async submitTransactionsAsync ( password ) {

        debugLog ( 'submitTransactions' );

        await this.loadAsync ();

        this.appState.assertPassword ( password );

        this.setTransactionError ();

        const recordBy = new Date ();
        recordBy.setTime ( recordBy.getTime () + ( 8 * 60 * 60 * 1000 )); // yuck

        const pending = this.pendingQueue;
        let nonce = pending.length ? ( pending [ pending.length - 1 ].nonce + 1 ) : this.accountService.nonce;

        for ( let queueEntry of this.unsentQueue ) {

            const body                  = await this.getTransactionBodyAsync ( queueEntry.uuid );

            body.maxHeight              = 0; // don't use for now
            body.recordBy               = recordBy.toISOString ();
            body.maker.nonce            = nonce++;

            let envelope = {
                body: JSON.stringify ( body ),
            };

            const hexKey                = this.account.keys [ body.maker.keyName ];
            const privateKeyHex         = crypto.aesCipherToPlain ( hexKey.privateKeyHexAES, password );
            const key                   = await crypto.keyFromPrivateHex ( privateKeyHex );

            envelope.signature = {
                hashAlgorithm:  'SHA256',
                signature:      key.sign ( envelope.body ),
            };

            // replace the transaction body with an envelope
            await AppDB.putAsync ( 'transactions', { networkID: this.networkService.networkID, accountIndex: this.accountService.index, uuid: queueEntry.uuid, envelope: envelope });

            queueEntry.submitWithNonce ( body.maker.nonce );
        }

        await this.saveAsync ();
    }

    //----------------------------------------------------------------//
    @action
    async updateQueueStatusAsync () {

        const nonce = this.accountService.nonce;

        await this.loadAsync ();
        let needsSave = false;

        runInAction (() => {
            for ( let queueEntry of this.queue ) {

                switch ( queueEntry.queueStatus ) {

                    case TX_QUEUE_STATUS.ACCEPTED:
                        if ( queueEntry.nonce >= nonce ) {
                            queueEntry.status = TX_STATUS.LOST;
                            needsSave = true;
                        }
                        break;

                    case TX_QUEUE_STATUS.LOST:
                        if ( queueEntry.nonce < nonce ) {
                            queueEntry.status = TX_STATUS.RESTORED;
                            needsSave = true;
                        }
                        break;

                    case TX_QUEUE_STATUS.PENDING:
                        if ( queueEntry.nonce < nonce ) {
                            queueEntry.status = TX_STATUS.ACCEPTED;
                            queueEntry.clearMiners ();
                            needsSave = true;
                        }
                        break;
                }
            }
        });

        if ( needsSave ) {
            await this.saveAsync ();
        }
    }
}
