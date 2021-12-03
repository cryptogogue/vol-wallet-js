// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { assert, util }                     from 'fgc';
import { action, computed, observable }     from 'mobx';

//const debugLog = function () {}
const debugLog = function ( ...args ) { console.log ( '@TX:', ...args ); }

export const TRANSACTION_TYPE = {
    ACCOUNT_POLICY:             'ACCOUNT_POLICY',
    AFFIRM_KEY:                 'AFFIRM_KEY',
    BETA_GET_ASSETS:            'BETA_GET_ASSETS',
    BETA_GET_DECK:              'BETA_GET_DECK',
    BUY_ASSETS:                 'BUY_ASSETS',
    CANCEL_OFFER:               'CANCEL_OFFER',
    HARD_RESET:                 'HARD_RESET',
    KEY_POLICY:                 'KEY_POLICY',
    OPEN_ACCOUNT:               'OPEN_ACCOUNT',
    OFFER_ASSETS:               'OFFER_ASSETS',
    PUBLISH_SCHEMA:             'PUBLISH_SCHEMA',
    PUBLISH_SCHEMA_AND_RESET:   'PUBLISH_SCHEMA_AND_RESET',
    REGISTER_MINER:             'REGISTER_MINER',
    RENAME_ACCOUNT:             'RENAME_ACCOUNT',
    RESERVE_ACCOUNT_NAME:       'RESERVE_ACCOUNT_NAME',
    RUN_SCRIPT:                 'RUN_SCRIPT',
    SELECT_REWARD:              'SELECT_REWARD',
    SEND_ASSETS:                'SEND_ASSETS',
    SEND_VOL:                   'SEND_VOL',
    STAMP_ASSETS:               'STAMP_ASSETS',
    SET_MINIMUM_GRATUITY:       'SET_MINIMUM_GRATUITY',
    SET_TERMS_OF_SERVICE:       'SET_TERMS_OF_SERVICE',
    UPGRADE_ASSETS:             'UPGRADE_ASSETS',
    UPDATE_MINER_INFO:          'UPDATE_MINER_INFO',
};

export const TX_STATUS = {

    // STAGED
    STAGED:             'STAGED',

    // PENDING
    PENDING:            'PENDING',
    SENT:               'SENT',
    MIXED:              'MIXED',

    // STOPPED
    REJECTED:           'REJECTED',
    BLOCKED:            'BLOCKED',

    // ACCEPTED
    ACCEPTED:           'ACCEPTED',
    RESTORED:           'RESTORED',
    LOST:               'LOST',

    // HISTORY
    HISTORY:            'HISTORY',
};

export const TX_QUEUE_STATUS = {

    ACCEPTED:           'ACCEPTED',
    BLOCKED:            'BLOCKED',
    LOST:               'LOST',
    PENDING:            'PENDING',
    STAGED:             'STAGED',
};

//================================================================//
// TransactionStatus
//================================================================//
export class TransactionStatus {

    @observable status              = TX_STATUS.STAGED;
    @observable accountName         = '';
    @observable assetsFiltered      = {};
    @observable cost                = 0;
    @observable miners              = [];
    @observable acceptedCount       = 0;
    @observable uuid                = '';
    @observable type                = '';
    @observable nonce               = -1;

    @computed get friendlyName      () { return Transaction.friendlyNameForType ( this.type ); }
    @computed get isAccepted        () { return ( this.queueStatus === TX_QUEUE_STATUS.ACCEPTED ); }
    @computed get isBlocked         () { return ( this.queueStatus === TX_QUEUE_STATUS.BLOCKED ); }
    @computed get isLost            () { return ( this.queueStatus === TX_QUEUE_STATUS.LOST ); }
    @computed get isPending         () { return ( this.queueStatus === TX_QUEUE_STATUS.PENDING ); }
    @computed get isStaged          () { return ( this.queueStatus === TX_QUEUE_STATUS.STAGED ); }
    @computed get isUnsent          () { return !(( this.queueStatus === TX_QUEUE_STATUS.ACCEPTED ) || ( this.queueStatus === TX_QUEUE_STATUS.PENDING ) || ( this.queueStatus === TX_QUEUE_STATUS.LOST )); }
    @computed get queueStatus       () { return this.getQueueStatus (); }

    //----------------------------------------------------------------//
    @action
    affirmMiner ( minerURL ) {

        if ( !this.miners.includes ( minerURL )) {
            this.miners.push ( minerURL );
        }
    }

    //----------------------------------------------------------------//
    @action
    clearMiners () {

        this.miners = [];
    }

    //----------------------------------------------------------------//
    constructor () {
    }

    //----------------------------------------------------------------//
    @action
    static fromTransaction ( transaction ) {

        const self = new TransactionStatus ();

        self.accountName        = transaction.body.maker.accountName;
        self.assetsFiltered     = _.cloneDeep ( transaction.assetsFiltered );
        self.cost               = transaction.cost;
        self.uuid               = transaction.uuid;
        self.type               = transaction.type;

        return self;
    }

    //----------------------------------------------------------------//
    getQueueStatus () {

        switch ( this.status ) {

            // STAGED
            case TX_STATUS.STAGED:    // isUnsent
                return TX_QUEUE_STATUS.STAGED;

            // PENDING
            case TX_STATUS.PENDING:
            case TX_STATUS.SENT:
            case TX_STATUS.MIXED:
                return TX_QUEUE_STATUS.PENDING;

            // BLOCKED
            case TX_STATUS.REJECTED:  // isUnsent
            case TX_STATUS.BLOCKED:   // isUnsent
                return TX_QUEUE_STATUS.BLOCKED;

            // ACCEPTED
            case TX_STATUS.ACCEPTED:
            case TX_STATUS.RESTORED:
                return TX_QUEUE_STATUS.ACCEPTED;

            // LOST
            case TX_STATUS.LOST:      // isUnsent
                return TX_QUEUE_STATUS.LOST;
        }
        assert ( false );
    }

    //----------------------------------------------------------------//
    @action
    static load ( transaction ) {

        const loadedTransaction             = new TransactionStatus ();

        loadedTransaction.status            = transaction.status;
        loadedTransaction.accountName       = transaction.accountName;
        loadedTransaction.assetsFiltered    = transaction.assetsFiltered || {};
        loadedTransaction.cost              = transaction.cost;
        loadedTransaction.miners            = transaction.miners;
        loadedTransaction.acceptedCount     = transaction.acceptedCount;
        loadedTransaction.uuid              = transaction.uuid;
        loadedTransaction.type              = transaction.type;
        loadedTransaction.nonce             = transaction.nonce;

        return loadedTransaction;
    }

    //----------------------------------------------------------------//
    @action
    setAcceptedCount ( acceptedCount ) {

        this.acceptedCount  = acceptedCount;
    }

    //----------------------------------------------------------------//
    @action
    setNonce ( nonce ) {

        this.nonce          = nonce;
    }

    //----------------------------------------------------------------//
    @action
    setStatus ( status ) {

        this.status         = status;
    }
};

//================================================================//
// Transaction
//================================================================//
export class Transaction {

    get accountID           () { return this.maker.accountName; }
    get cost                () { return ( this.body.maker.gratuity || 0 ) + ( this.body.maker.transferTax || 0 ) + this.vol; }
    get friendlyName        () { return Transaction.friendlyNameForType ( this.body.type ); }
    get maker               () { return this.body.maker; }
    get nonce               () { return this.maker.nonce; }
    get type                () { return this.body.type; }
    get uuid                () { return this.body.uuid || ''; }
    get vol                 () { return this.virtual_getSendVOL ? this.virtual_getSendVOL () : 0; }
    get weight              () { return this.virtual_getWeight ? this.virtual_getWeight () : 1; }

    //----------------------------------------------------------------//
    constructor ( body ) {

        this.assetsFiltered         = {};
        this.body                   = body;
    }

    //----------------------------------------------------------------//
    static friendlyNameForType ( type ) {

        switch ( type ) {
            case TRANSACTION_TYPE.ACCOUNT_POLICY:               return 'Account Policy';
            case TRANSACTION_TYPE.AFFIRM_KEY:                   return 'Affirm Key';
            case TRANSACTION_TYPE.BETA_GET_DECK:                return 'BETA Get Deck';
            case TRANSACTION_TYPE.BETA_GET_ASSETS:              return 'BETA Get Assets';
            case TRANSACTION_TYPE.BUY_ASSETS:                   return 'Buy Assets';
            case TRANSACTION_TYPE.CANCEL_OFFER:                 return 'Cancel Offer';
            case TRANSACTION_TYPE.KEY_POLICY:                   return 'Key Policy';
            case TRANSACTION_TYPE.OFFER_ASSETS:                 return 'Sell Assets';
            case TRANSACTION_TYPE.OPEN_ACCOUNT:                 return 'Sponsor Account';
            case TRANSACTION_TYPE.PUBLISH_SCHEMA:               return 'Publish Schema';
            case TRANSACTION_TYPE.PUBLISH_SCHEMA_AND_RESET:     return 'Publish Schema and Reset';
            case TRANSACTION_TYPE.REGISTER_MINER:               return 'Register Miner';
            case TRANSACTION_TYPE.RENAME_ACCOUNT:               return 'Rename Account';
            case TRANSACTION_TYPE.RESERVE_ACCOUNT_NAME:         return 'Reserve Account Name';
            case TRANSACTION_TYPE.RUN_SCRIPT:                   return 'Run Script';
            case TRANSACTION_TYPE.SELECT_REWARD:                return 'Select Reward';
            case TRANSACTION_TYPE.SEND_ASSETS:                  return 'Send Assets';
            case TRANSACTION_TYPE.SEND_VOL:                     return 'Send VOL';
            case TRANSACTION_TYPE.STAMP_ASSETS:                 return 'Stamp Assets';
            case TRANSACTION_TYPE.SET_MINIMUM_GRATUITY:         return 'Set Minimum Gratuity';
            case TRANSACTION_TYPE.SET_TERMS_OF_SERVICE:         return 'Set Terms of Service';
            case TRANSACTION_TYPE.UPGRADE_ASSETS:               return 'Upgrade Assets';
            case TRANSACTION_TYPE.UPDATE_MINER_INFO:            return 'Update Miner Info';
        }
        return 'UNKNOWN';
    }

    //----------------------------------------------------------------//
    static fromBody ( body ) {

        switch ( body.type ) {
            case TRANSACTION_TYPE.BUY_ASSETS:       return new Transaction_BuyAssets ( body );
            case TRANSACTION_TYPE.OPEN_ACCOUNT:     return new Transaction_OpenAccount ( body );
            case TRANSACTION_TYPE.RUN_SCRIPT:       return new Transaction_RunScript ( body );
            case TRANSACTION_TYPE.SEND_VOL:         return new Transaction_SendVOL ( body );
            case TRANSACTION_TYPE.STAMP_ASSETS:     return new Transaction_StampAssets ( body );
            default:                                return new Transaction ( body );
        }
    }

    //----------------------------------------------------------------//
    @action
    static load ( transaction ) {

        return Transaction.fromBody ( transaction.body );
    }

    //----------------------------------------------------------------//
    @action
    setAssetsFiltered ( assetIDs, filterStatus ) {

        this.assetsFiltered = this.assetsFiltered || {};
        for ( let assetID of assetIDs ) {
            this.assetsFiltered [ assetID ] = filterStatus;
        }
    }

    //----------------------------------------------------------------//
    @action
    setBody ( body ) {

        this.body = body;
    }

    //----------------------------------------------------------------//
    @action
    setFees ( feeSchedule ) {

        if ( feeSchedule ) {

            const feeProfile = feeSchedule.transactionProfiles [ this.type ] || feeSchedule.defaultProfile || false;
            if ( feeProfile ) {

                const maker = this.body.maker;

                const calculate = ( amount, percent ) => {
                    if (( percent.factor === 0 ) || ( percent.integer === 0 )) return 0;
                    const shareF = Math.floor ((( amount * percent.factor ) * percent.integer ) / percent.factor ); // I shot the shareF?
                    return Math.floor ( shareF / percent.factor ) + ((( shareF % percent.factor ) == 0 ) ? 0 : 1 );
                }
                maker.profitShare      = calculate ( maker.gratuity, feeProfile.profitShare );
                maker.transferTax      = calculate ( this.vol, feeProfile.transferTax );
            }
        }
    }

    //----------------------------------------------------------------//
    @action
    setUUID ( uuid ) {

        this.body.uuid = uuid || util.generateUUIDV4 ();
    }

    //----------------------------------------------------------------//
    @action
    setWeight ( weight ) {

        this.body.weight    = weight;
    }
};

//================================================================//
// Transaction_BuyAssets
//================================================================//
class Transaction_BuyAssets extends Transaction {

    //----------------------------------------------------------------//
    virtual_getSendVOL () {

        return this.body.price || 0;
    }
};

//================================================================//
// Transaction_OpenAccount
//================================================================//
class Transaction_OpenAccount extends Transaction {

    //----------------------------------------------------------------//
    virtual_getSendVOL () {

        return this.body.grant || 0;
    }
};

//================================================================//
// Transaction_RunScript
//================================================================//
class Transaction_RunScript extends Transaction {

    //----------------------------------------------------------------//
    virtual_getWeight () {

        return ( this.body.weight || 1 );
    }
};

//================================================================//
// Transaction_SendVOL
//================================================================//
class Transaction_SendVOL extends Transaction {

    //----------------------------------------------------------------//
    virtual_getSendVOL () {

        return this.body.amount || 0;
    }
};

//================================================================//
// Transaction_StampAssets
//================================================================//
class Transaction_StampAssets extends Transaction {

    //----------------------------------------------------------------//
    virtual_getSendVOL () {

        return this.body.price * this.body.assetIdentifiers.length;
    }
};

