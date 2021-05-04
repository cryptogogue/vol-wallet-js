// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { assert, util } from 'fgc';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';

//const debugLog = function () {}
const debugLog = function ( ...args ) { console.log ( '@TX:', ...args ); }

export const TRANSACTION_TYPE = {
    ACCOUNT_POLICY:             'ACCOUNT_POLICY',
    AFFIRM_KEY:                 'AFFIRM_KEY',
    BETA_GET_ASSETS:            'BETA_GET_ASSETS',
    BETA_GET_DECK:              'BETA_GET_DECK',
    HARD_RESET:                 'HARD_RESET',
    KEY_POLICY:                 'KEY_POLICY',
    OPEN_ACCOUNT:               'OPEN_ACCOUNT',
    PUBLISH_SCHEMA:             'PUBLISH_SCHEMA',
    PUBLISH_SCHEMA_AND_RESET:   'PUBLISH_SCHEMA_AND_RESET',
    REGISTER_MINER:             'REGISTER_MINER',
    RENAME_ACCOUNT:             'RENAME_ACCOUNT',
    RESERVE_ACCOUNT_NAME:       'RESERVE_ACCOUNT_NAME',
    RUN_SCRIPT:                 'RUN_SCRIPT',
    SELECT_REWARD:              'SELECT_REWARD',
    SEND_ASSETS:                'SEND_ASSETS',
    SEND_VOL:                   'SEND_VOL',
    SET_MINIMUM_GRATUITY:       'SET_MINIMUM_GRATUITY',
    UPGRADE_ASSETS:             'UPGRADE_ASSETS',
    UPDATE_MINER_INFO:          'UPDATE_MINER_INFO',
};

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

//================================================================//
// Transaction
//================================================================//
export class Transaction {

    @observable status        = TX_STATUS.STAGED;
    @observable subStatus     = TX_SUB_STATUS.LOCAL;
    @observable assets        = [];
    @observable miners        = [];
    @observable envelope      = false;

    @computed get accountID         () { return this.maker.accountName; }
    @computed get cost              () { return ( this.body.maker.gratuity || 0 ) + ( this.body.maker.transferTax || 0 ) + this.vol; }
    @computed get maker             () { return this.body.maker; }
    @computed get nonce             () { return this.maker.nonce; }
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
            case TRANSACTION_TYPE.KEY_POLICY:                   return 'Key Policy';
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
            case TRANSACTION_TYPE.SET_MINIMUM_GRATUITY:         return 'Set Minimum Gratuity';
            case TRANSACTION_TYPE.UPGRADE_ASSETS:               return 'Upgrade Assets';
            case TRANSACTION_TYPE.UPDATE_MINER_INFO:            return 'Update Miner Info';
        }
        return 'UNKNOWN';
    }

    //----------------------------------------------------------------//
    static fromBody ( body ) {

        switch ( body.type ) {
            case TRANSACTION_TYPE.OPEN_ACCOUNT: return new Transaction_OpenAccount ( body );
            case TRANSACTION_TYPE.RUN_SCRIPT:   return new Transaction_RunScript ( body );
            case TRANSACTION_TYPE.SEND_VOL:     return new Transaction_SendVOL ( body );
            default:                            return new Transaction ( body );
        }
    }

    //----------------------------------------------------------------//
    @action
    static load ( transaction ) {

        const loadedTransaction = Transaction.fromBody ( transaction.body );

        loadedTransaction.status        = transaction.status;
        loadedTransaction.subStatus     = transaction.subStatus;
        loadedTransaction.assets        = transaction.assets;
        loadedTransaction.miners        = transaction.miners;
        loadedTransaction.envelope      = transaction.envelope;
    
        return loadedTransaction;
    }

    //----------------------------------------------------------------//
    @action
    setAssetsUtilized ( assets ) {

        this.assets = assets.splice ( 0 );
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
    setStatus ( status, subStatus ) {

        this.status         = status;
        this.subStatus      = subStatus;
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
