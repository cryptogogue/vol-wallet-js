// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as AppDB                       from './AppDB';
import { Transaction, TransactionStatus, TX_STATUS, TRANSACTION_TYPE } from '../transactions/Transaction';
import * as vol                         from '../util/vol';
import { assert, crypto, RevocableContext } from 'fgc';
import _                                from 'lodash';
import { action, computed, observable, runInAction, toJS } from 'mobx';

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

        this.clearTransactionError ();

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

        const consensusService = this.networkService.consensusService;
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
    finalize () {

        this.revocable.finalize ();
    }

    //----------------------------------------------------------------//
    @action
    async findNonceAsync ( accountID ) {

        debugLog ( 'findNonceAsync' );

        if ( this.pendingTransactions.length > 0 ) {
            return this.pendingTransactions [ this.pendingTransactions.length - 1 ].nonce + 1;
        }

        const consensusService = this.networkService.consensusService;
        if ( !consensusService.isOnline ) return false;

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

                const amount = vol.format ( body.amount );

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
        const accountName       = transaction.accountName;
        
        debugLog ( 'CONSENSUS SERVICE ONLINE:', consensusService.isOnline );

        if ( !consensusService.isOnline ) return;

        let responseCount = 0;
        let acceptedCount = 0;
        let rejectedCount = 0;

        let rejected = [];

        if ( transaction.miners.length === 0 ) {
            transaction.setStatus ( TX_STATUS.SENT );
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

        const checkTransactionStatus = async ( minerURL ) => {

            const serviceURL = consensusService.formatServiceURL ( minerURL, `/accounts/${ accountName }/transactions/${ transaction.uuid }` );

            if ( !transaction.miners.includes ( minerURL )) {
                debugLog ( 'submitting tx to:', minerURL );
                if ( await this.putTransactionAsync ( serviceURL, await loadEnvelope ())) {
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
                        await this.putTransactionAsync ( serviceURL, await loadEnvelope ());
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
                debugLog ( 'ACCEPTED:', transaction.nonce, transaction.UUID );
                transaction.setStatus ( TX_STATUS.ACCEPTED );
                transaction.clearMiners ();
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
    async putTransactionAsync ( serviceURL, envelope ) {

        debugLog ( 'putTransactionsAsync', envelope );

        let result = false;

        try {
            result = await this.revocable.fetchJSON ( serviceURL, {
                method :    'PUT',
                headers :   { 'content-type': 'application/json' },
                body :      JSON.stringify ( envelope, null, 4 ),
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
    async submitTransactionsAsync ( password, nonce ) {

        debugLog ( 'submitTransactions' );

        await this.loadAsync ();

        this.appState.assertPassword ( password );

        this.clearTransactionError ();

        const recordBy = new Date ();
        recordBy.setTime ( recordBy.getTime () + ( 8 * 60 * 60 * 1000 )); // yuck

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

            runInAction (() => {
                transaction.status      = TX_STATUS.PENDING;
                transaction.miners      = [];
                transaction.nonce       = body.maker.nonce;
            });
        }

        await this.saveAsync ();
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
