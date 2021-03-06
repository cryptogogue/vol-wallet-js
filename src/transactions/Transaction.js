// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { assert, util }                 from 'fgc';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';

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

    STAGED:             'STAGED',
    PENDING:            'PENDING',
    BLOCKED:            'BLOCKED',
    ACCEPTED:           'ACCEPTED',
    LOST:               'LOST',
};

//================================================================//
// Transaction
//================================================================//
export class Transaction {

    @observable status              = TX_STATUS.STAGED;
    @observable assetsFiltered      = {};
    @observable miners              = [];
    @observable envelope            = false;
    @observable acceptedCount       = 0;

    @computed get accountID         () { return this.maker.accountName; }
    @computed get cost              () { return ( this.body.maker.gratuity || 0 ) + ( this.body.maker.transferTax || 0 ) + this.vol; }
    @computed get friendlyName      () { return Transaction.friendlyNameForType ( this.body.type ); }
    @computed get isAccepted        () { return ( this.queueStatus === TX_QUEUE_STATUS.ACCEPTED ); }
    @computed get isLost            () { return ( this.queueStatus === TX_QUEUE_STATUS.LOST ); }
    @computed get isPending         () { return ( this.queueStatus === TX_QUEUE_STATUS.PENDING ); }
    @computed get isRestored        () { return ( this.queueStatus === TX_QUEUE_STATUS.RESTORED ); }
    @computed get isUnsent          () { return !(( this.queueStatus === TX_QUEUE_STATUS.ACCEPTED ) || ( this.queueStatus === TX_QUEUE_STATUS.PENDING )); }
    @computed get maker             () { return this.body.maker; }
    @computed get nonce             () { return this.maker.nonce; }
    @computed get queueStatus       () { return this.getQueueStatus (); }
    @computed get type              () { return this.body.type; }
    @computed get uuid              () { return this.body.uuid || ''; }
    @computed get vol               () { return this.virtual_getSendVOL ? this.virtual_getSendVOL () : 0; }
    @computed get weight            () { return this.virtual_getWeight ? this.virtual_getWeight () : 1; }

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
    constructor ( body ) {
        
        extendObservable ( this, {
            body:       body,
        });
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

        const loadedTransaction = Transaction.fromBody ( transaction.body );

        loadedTransaction.status            = transaction.status;
        loadedTransaction.assetsFiltered    = transaction.assetsFiltered || {};
        loadedTransaction.miners            = transaction.miners;
        loadedTransaction.envelope          = transaction.envelope;
    
        loadedTransaction.makerIndex        = transaction.makerIndex;
        loadedTransaction.details           = transaction.details;

        return loadedTransaction;
    }

    //----------------------------------------------------------------//
    @action
    setAcceptedCount ( acceptedCount ) {

        this.acceptedCount              = acceptedCount;
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
    setEnvelope ( envelope ) {

        this.envelope = envelope || false;
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
    setNote ( note ) {

        this.note = note || '';
    }

    //----------------------------------------------------------------//
    @action
    setStatus ( status ) {

        this.status         = status;
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

