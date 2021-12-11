// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as AppDB                               from './AppDB';
import { Transaction, TransactionStatus, TX_MINER_STATUS, TX_QUEUE_STATUS, TX_STATUS, TRANSACTION_TYPE } from '../transactions/Transaction';
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

const TX_MINER_TIMEOUT = 10000;

//================================================================//
// TransactionQueueService
//================================================================//
export class TransactionQueueService {

    @observable status          = TX_SERVICE_STATUS.UNLOADED;
    @observable history         = [];
    @observable queue           = [];

    @computed get account                   () { return this.accountService.account; }
    @computed get hasTransactionError       () { return this.accountService.hasTransactionError; }
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
            if ( entry.makerIndex === this.accountService.index ) {
                transactions.push ( entry.transaction );
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
    async clearAndResetAsync () {

        this.setTransactionError ();

        await this.loadAsync ();
        runInAction (() => {
            this.queue          = [];
            this.history        = [];
            this.status         = TX_SERVICE_STATUS.UNLOADED;
        });
        await AppDB.putAsync ( 'transactionQueue', { networkID: this.networkService.networkID, accountIndex: this.accountService.index, transactions: []});
        await AppDB.putAsync ( 'transactionHistory', { networkID: this.networkService.networkID, accountIndex: this.accountService.index, entries: []});
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

            const makerIndex    = entry.transaction.makerIndex;
            const details       = entry.transaction.details;
            const body          = JSON.parse ( entry.transaction.body );

            const txObject      = Transaction.fromBody ( body );
            const transaction   = TransactionStatus.fromTransaction ( txObject );

            transaction.setStatus ( TX_STATUS.HISTORY );
            transaction.setNonce ( body.maker.nonce );

            runInAction (() => {
                this.history.push ({
                    time:               entry.time,
                    blockHeight:        entry.blockHeight,
                    makerIndex:         makerIndex,
                    type:               body.type,
                    explanation:        this.getExplanation ( makerIndex, body, details ),
                    transaction:        transaction,
                });
            });

            await AppDB.putAsync ( 'transactions', { networkID: this.networkService.networkID, accountIndex: this.accountService.index, uuid: body.uuid, envelope: entry.transaction });
        }

        await AppDB.putAsync ( 'transactionHistory', { networkID: this.networkService.networkID, accountIndex: this.accountService.index, entries: toJS ( this.history )});
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
    getExplanation ( makerIndex, body, details ) {    
        
        const isMaker       = this.accountService.index === makerIndex;

        const formatAssetList = ( assets ) => {

            if ( !assets.length ) return 'no assets';

            if ( assets.length === 1 ) {
                return `an asset (${ assets [ 0 ].assetID })`;
            }

            const assetIDs = [];
            for ( let asset of assets ) {
                assetIDs.push ( asset.assetID );
            }

            return `${ assets.length } assets (${ assetIDs.join ( ', ' )})`;
        }

        switch ( body.type ) {

            case TRANSACTION_TYPE.BUY_ASSETS: {

                const assetList = details ? formatAssetList ( details.assets ) : '[unknown assets]';

                if ( isMaker ) return `You bought ${ assetList } from ${ details.from }.`;
                return `${ details.to } bought ${ assetList } from you.`;
            }

            case TRANSACTION_TYPE.PUBLISH_SCHEMA:
            case TRANSACTION_TYPE.PUBLISH_SCHEMA_AND_RESET: {

                const version = body.schema.version;
                return `You published '${ version.release } - ${ version.major }.${ version.minor }.${ version.revision }'.`;
            }

            case TRANSACTION_TYPE.SEND_ASSETS: {

                const assetList = details ? formatAssetList ( details.assets ) : '[deleted assets]';

                if ( isMaker ) return `You sent ${ assetList } to ${ body.accountName }.`;
                return `${ body.maker.accountName } sent you ${ assetList }.`;
            }

            case TRANSACTION_TYPE.SEND_VOL: {

                const amount = vol.util.format ( body.amount );

                if ( isMaker ) return `You sent ${ body.accountName } ${ amount } VOL.`;
                return `${ body.maker.accountName } sent you ${ amount } VOL.`;
            }
        }
        return '--';
    }

    //----------------------------------------------------------------//
    async getTransactionBodyAsync ( uuid ) {

        const transactionRow = await AppDB.getAsync ( 'transactions', { networkID: this.networkService.networkID, accountIndex: this.accountService.index, uuid: uuid });
        return transactionRow && (( transactionRow.envelope && JSON.parse ( transactionRow.envelope.body )) || transactionRow.body ) || {};
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
        const historyRecord     = await AppDB.getAsync ( 'transactionHistory', { networkID: this.networkService.networkID, accountIndex: this.accountService.index });

        runInAction (() => {
            
            this.queue = queueRecord && queueRecord.transactions ? queueRecord.transactions : [];
            for ( let i in this.queue ) {
                this.queue [ i ] = TransactionStatus.load ( this.queue [ i ]);
            }

            this.history = historyRecord && historyRecord.entries ? historyRecord.entries : [];
            for ( let i in this.history ) {
                this.history [ i ].transaction = TransactionStatus.load ( this.history [ i ].transaction );
            }

            this.status = TX_SERVICE_STATUS.LOADED;
        });

        debugLog ( 'TX QUEUE LOADED' );
    }

    //----------------------------------------------------------------//
    @computed get
    lostTransactions () {
        return this.queue.filter (( elem ) => { return ( elem.status === TX_STATUS.LOST )});
    }

    //----------------------------------------------------------------//
    @computed get
    pendingOfferIDs () {

        const offerIDs = [];
        for ( let transaction of this.costBearingTransactions ) {
            if ( transaction.offerID !== false ) {
                offerIDs.push ( transaction.offerID );
            }
        }
        return offerIDs;
    }

    //----------------------------------------------------------------//
    @computed get
    pendingTransactions () {
        return this.queue.filter (( elem ) => { return elem.isPending });
    }

    //----------------------------------------------------------------//
    @action
    async processMinerAsync ( transaction, miner, loadEnvelope ) {

        const minerID       = miner.minerID;
        const minerURL      = miner.url;

        debugLog ( 'process miner', minerID, minerURL );

        transaction.affirmMiner ( minerID );

        if ( transaction.getMinerStatus ( minerID ) === TX_MINER_STATUS.REJECTED ) return;
        if ( transaction.getMinerBusy ( minerID )) return;

        const submitCount = transaction.submitCount;
        transaction.setMinerBusy ( minerID, true );

        const serviceURL = this.consensusService.formatServiceURL ( minerURL, `/accounts/${ transaction.accountName }/transactions/${ transaction.uuid }` );

        const putTransactionAsync = async () => {

            debugLog ( 'submitting transaction', minerID, transaction.uuid );

            // re-send the transaction if not recognized.
            const envelope = await loadEnvelope ();
            const result = await this.revocable.fetchJSON ( serviceURL, {
                method :    'PUT',
                headers :   { 'content-type': 'application/json' },
                body :      JSON.stringify ( envelope, null, 4 ),
            }, TX_MINER_TIMEOUT );

            if ( transaction.submitCount !== submitCount ) return;

            if ( result && ( result.status === 'OK' )) {
                transaction.setMinerStatus ( minerID, TX_MINER_STATUS.ACCEPTED );
            }
        }

        try {
            
            if ( transaction.getMinerStatus ( minerID ) === TX_MINER_STATUS.NEW ) {
                await putTransactionAsync ();
            }
            else {

                debugLog ( 'checking transaction', minerID, transaction.uuid );
                const response = await this.revocable.fetchJSON ( serviceURL, undefined, TX_MINER_TIMEOUT );
                if ( transaction.submitCount !== submitCount ) return;

                debugLog ( 'RESPONSE:', response );

                switch ( response.status ) {

                    case 'ACCEPTED':
                        
                        transaction.setMinerStatus ( minerID, TX_MINER_STATUS.ACCEPTED );
                        break;

                    case 'REJECTED':
                    case 'IGNORED':
                        
                        if ( response.uuid === transaction.uuid ) {
                            transaction.setMinerStatus ( minerID, TX_MINER_STATUS.REJECTED );
                            transaction.setRejection ( response );
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
            if ( transaction.submitCount !== submitCount ) return;
            if ( transaction.getMinerStatus ( minerID ) === TX_MINER_STATUS.NEW ) { 
                transaction.setMinerStatus ( minerID, TX_MINER_STATUS.TIMED_OUT );
            }
        }

        transaction.setMinerBusy ( minerID, false );
    }

    //----------------------------------------------------------------//
    @action
    async processTransaction ( transaction ) {

        if ( this.hasTransactionError ) return;
        if ( !transaction.isPending ) return;

        const consensusService  = this.consensusService;
        const accountName       = transaction.accountName;
        
        if ( !consensusService.isOnline ) return;

        if ( transaction.status === TX_STATUS.PENDING ) {
            transaction.setStatus ( TX_STATUS.SENDING );
        }

        let envelope = false;
        const loadEnvelope = async () => {
            if ( envelope === false ) {
                const transactionRow = await AppDB.getAsync ( 'transactions', { networkID: this.networkService.networkID, accountIndex: this.accountService.index, uuid: transaction.uuid });
                envelope = transactionRow.envelope;
                assert ( envelope );
            }
            return envelope;
        }

        // send transaction to all online miners
        const miners = consensusService.onlineMiners;
        for ( let miner of miners ) {
            this.processMinerAsync ( transaction, miner, loadEnvelope );
        }

        const responseCount = transaction.respondingMiners.length;
        const rejectCount   = transaction.rejectingMiners.length;

        // if we got any responses, do something
        if ( responseCount ) {

            // if there were rejections, do something
            if ( rejectCount ) {

                if ( rejectCount === responseCount ) {

                    const rejection = transaction.rejection;
                    this.setTransactionError ( rejection.uuid, rejection.message );
                    transaction.setStatus ( TX_STATUS.REJECTED );

                    for ( let transaction of this.queue ) {
                        if (( transaction.isPending || transaction.isUnsent ) && ( transaction.status !== TX_STATUS.REJECTED )) {
                            transaction.setStatus ( TX_STATUS.BLOCKED );
                        }
                    }
                }
                else {
                    transaction.setStatus ( TX_STATUS.MIXED );
                }
            }
            else {
                transaction.setStatus ( TX_STATUS.SENDING );
            }
        }
    }

    //----------------------------------------------------------------//
    @action
    async resetHistoryAsync () {

        this.history = [];
        await AppDB.putAsync ( 'transactionHistory', { networkID: this.networkService.networkID, accountIndex: this.accountService.index, entries: toJS ( this.history )});
    }

    //----------------------------------------------------------------//
    @action
    async restoreTransactionsAsync () {

        const queue     = this.queue;
        const history   = this.accountQueueHistory;
        const length    = history.length < queue.length ? queue.length : history.length;

        for ( let i = 0; i < length; ++i ) {

            const txFromQueue       = ( i < queue.length ) ? queue [ i ] : false;
            const txFromHistory     = ( i < history.length ) ? history [ i ] : false;

            assert ( txFromQueue || txFromHistory );

            // if there's a tx from the queue, don't overwrite it
            if ( txFromQueue ) continue;

            // tx from history; overwrite
            if ( txFromHistory ) {

                debugLog ( 'restoring transaction', txFromHistory.type );

                const transaction = _.cloneDeep ( txFromHistory );
                assert ( transaction instanceof TransactionStatus );

                transaction.setStatus ( TX_STATUS.RESTORED );
                this.queue [ i ] = transaction;
            }
        }

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
        await this.updateTransactionStatusAsync ();
        await this.restoreTransactionsAsync ();

        if ( this.hasTransactionError ) return;

        for ( let transaction of this.pendingTransactions ) {
            this.processTransaction ( transaction );
        }

        await this.saveAsync ();
    }

    //----------------------------------------------------------------//
    setTransactionError ( uuid, message ) {
        this.accountService.setTransactionError ( uuid, message );
    }

    //----------------------------------------------------------------//
    @computed get
    stagedTransactions () {
        return this.queue.filter (( elem ) => { return elem.status === TX_STATUS.STAGED });
    }

    //----------------------------------------------------------------//
    @action
    async stageTransactionAsync ( txObject ) {

        debugLog ( 'stageTransactionAsync', txObject );

        await ( this.loadAsync ());

        txObject.setUUID ();
        const body = _.cloneDeep ( txObject.body );

        const transaction = TransactionStatus.fromTransaction ( txObject );

        await AppDB.putAsync ( 'transactions', { networkID: this.networkService.networkID, accountIndex: this.accountService.index, uuid: transaction.uuid, body: body });

        runInAction (() => {
            this.queue.push ( transaction );
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

        const pending = this.pendingTransactions;
        let nonce = pending.length ? ( pending [ pending.length - 1 ].nonce + 1 ) : this.accountService.nonce;

        for ( let transaction of this.unsentTransactions ) {

            const body                  = await this.getTransactionBodyAsync ( transaction.uuid );

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
            await AppDB.putAsync ( 'transactions', { networkID: this.networkService.networkID, accountIndex: this.accountService.index, uuid: transaction.uuid, envelope: envelope });

            transaction.submitWithNonce ( body.maker.nonce );
        }

        await this.saveAsync ();
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

    //----------------------------------------------------------------//
    @action
    async updateTransactionStatusAsync () {

        const nonce = this.accountService.nonce;

        await this.loadAsync ();
        let needsSave = false;

        runInAction (() => {
            for ( let transaction of this.queue ) {

                switch ( transaction.queueStatus ) {

                    case TX_QUEUE_STATUS.ACCEPTED:
                        if ( transaction.nonce >= nonce ) {
                            transaction.status = TX_STATUS.LOST;
                            needsSave = true;
                        }
                        break;

                    case TX_QUEUE_STATUS.LOST:
                        if ( transaction.nonce < nonce ) {
                            transaction.status = TX_STATUS.RESTORED;
                            needsSave = true;
                        }
                        break;

                    case TX_QUEUE_STATUS.PENDING:
                        if ( transaction.nonce < nonce ) {
                            transaction.status = TX_STATUS.ACCEPTED;
                            transaction.clearMiners ();
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
