// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { Transaction, TRANSACTION_TYPE }    from './Transaction';
import { FIELD_CLASS }                      from './TransactionFormFieldControllers';
import { assert, excel, hooks, randomBytes, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import _                                    from 'lodash';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';

const SPECIAL_FIELDS = [
    'gratuity',
    'makerKeyName',
];

//================================================================//
// TransactionFormController
//================================================================//
export class TransactionFormController {

    @observable     cost = 0;

    //----------------------------------------------------------------//
    @computed get
    balance () {

        return this.appState.balance - this.cost;
    }

    //----------------------------------------------------------------//
    constructor () {
    }

    //----------------------------------------------------------------//
    finalize () {
    }

    //----------------------------------------------------------------//
    formatBody () {
        
        let result = {};
        for ( let field of this.fieldsArray ) {
            const fieldName = field.fieldName;
            if ( !SPECIAL_FIELDS.includes ( fieldName )) {
                result [ fieldName ] = field.value;
            }
        }
        return result;
    }

    //----------------------------------------------------------------//
    @computed get
    friendlyName () {

        return Transaction.friendlyNameForType ( this.type );
    }

    //----------------------------------------------------------------//
    initialize ( appState, type, fieldsArray ) {

        this.appState               = appState;
        this.type                   = type;
        this.makerAccountName       = appState.accountID;

        fieldsArray = fieldsArray || [];
        fieldsArray.push (
            new FIELD_CLASS.INTEGER         ( 'gratuity',       'Gratuity', 0 ),
            new FIELD_CLASS.ACCOUNT_KEY     ( 'makerKeyName',   'Maker Key', appState.getDefaultAccountKeyName ()),
        );

        const fields = {};
        for ( let field of fieldsArray ) {
            fields [ field.fieldName ] = field;
        }

        extendObservable ( this, {
            fields:             fields,
            fieldsArray:        fieldsArray,
            isComplete:         false,
            isErrorFree:        false,
        });

        this.transaction = this.makeTransaction ();
        this.validate ();
    }

    //----------------------------------------------------------------//
    @computed
    get isCompleteAndErrorFree () {

        return this.isComplete && this.isErrorFree;
    }

    //----------------------------------------------------------------//
    @action
    makeTransaction () {

        const body = this.virtual_composeBody ();
        body.maker = {
            gratuity:           this.fields.gratuity.value,
            accountName:        this.makerAccountName,
            keyName:            this.fields.makerKeyName.value,
            nonce:              -1,
        }
        const transaction = Transaction.transactionWithBody ( this.type, body );
        this.virtual_decorateTransaction ( transaction );
        return transaction;
    }

    //----------------------------------------------------------------//
    @action
    validate () {

        this.transaction    = this.makeTransaction ();
        this.cost           = this.transaction.getCost ();

        // check for completion
        this.isComplete = true;
        for ( let field of this.fieldsArray ) {
            if ( !field.isComplete ) {
                this.isComplete = false;
                break;
            }
        }

        // reset errors
        for ( let field of this.fieldsArray ) {
            field.error = false;
        }

        // check error free
        this.isErrorFree = true;
        this.virtual_validate ();
        for ( let field of this.fieldsArray ) {
            if ( field.error ) {
                this.isErrorFree = false;
                break;
            }
        }

        // check balance
        const cost = this.transaction.getCost ();
        if ( this.appState.balance < cost ) {
            this.isErrorFree = false;
        }
    }

    //----------------------------------------------------------------//
    virtual_composeBody () {

        return this.formatBody ();
    }

    //----------------------------------------------------------------//
    virtual_decorateTransaction ( transaction ) {
    }

    //----------------------------------------------------------------//
    virtual_validate () {
    }
}

//================================================================//
// TransactionFormController_AccountPolicy
//================================================================//
export class TransactionFormController_AccountPolicy extends TransactionFormController {

    //----------------------------------------------------------------//
    constructor ( appState ) {
        super ();

        const fieldsArray = [
            new FIELD_CLASS.STRING  ( 'policyName',     'Policy Name' ),
            new FIELD_CLASS.TEXT    ( 'policy',         'Policy', 8 ),
        ];
        this.initialize ( appState, TRANSACTION_TYPE.ACCOUNT_POLICY, fieldsArray );
    }
}

//================================================================//
// TransactionFormController_AffirmKey
//================================================================//
export class TransactionFormController_AffirmKey extends TransactionFormController {

    //----------------------------------------------------------------//
    constructor ( appState ) {
        super ();

        const fieldsArray = [
            new FIELD_CLASS.STRING      ( 'keyName',        'Key Name' ),
            new FIELD_CLASS.STRING      ( 'key',            'Key' ),
            new FIELD_CLASS.STRING      ( 'policyName',     'Policy' ),
        ];
        this.initialize ( appState, TRANSACTION_TYPE.AFFIRM_KEY, fieldsArray );
    }
}

//================================================================//
// TransactionFormController_BetaGetAssets
//================================================================//
export class TransactionFormController_BetaGetAssets extends TransactionFormController {

    //----------------------------------------------------------------//
    constructor ( appState ) {
        super ();

        const fieldsArray = [
            new FIELD_CLASS.INTEGER     ( 'numAssets',      'Copies', 1, 1 ),
        ];
        this.initialize ( appState, TRANSACTION_TYPE.BETA_GET_ASSETS, fieldsArray );
    }
}

//================================================================//
// TransactionFormController_KeyPolicy
//================================================================//
export class TransactionFormController_KeyPolicy extends TransactionFormController {

    //----------------------------------------------------------------//
    constructor ( appState ) {
        super ();

        const fieldsArray = [
            new FIELD_CLASS.STRING      ( 'policyName',     'Policy Name' ),
            new FIELD_CLASS.TEXT        ( 'policy',         'Policy', 8 ),
        ];
        this.initialize ( appState, TRANSACTION_TYPE.KEY_POLICY, fieldsArray );
    }
}

//================================================================//
// TransactionFormController_OpenAccount
//================================================================//
export class TransactionFormController_OpenAccount extends TransactionFormController {

    //----------------------------------------------------------------//
    constructor ( appState ) {
        super ();

        // TODO: replace with something deterministic        
        const suffixPart = () => {
            return randomBytes ( 2 ).toString ( 'hex' ).substring ( 0, 3 );
        }
        const suffix = `${ suffixPart ()}.${ suffixPart ()}.${ suffixPart()}`.toUpperCase ();
        console.log ( 'SUFFIX:', suffix );

        const fieldsArray = [
            new FIELD_CLASS.CONST           ( 'suffix',         'Suffix', suffix ),
            new FIELD_CLASS.CRYPTO_KEY      ( 'request',        'New Account Request', 6 ),
            new FIELD_CLASS.INTEGER         ( 'grant',          'Grant', 0, 0 ),
        ];
        this.initialize ( appState, TRANSACTION_TYPE.OPEN_ACCOUNT, fieldsArray );
    }

    //----------------------------------------------------------------//
    decodeRequest () {

        console.log ( 'DECODE REQUEST', this.fields.request.value );

        let encoded = this.fields.request.value;
        if ( encoded && encoded.length ) {
            try {

                encoded = encoded.replace ( /(\r\n|\n|\r )/gm, '' );
                console.log ( 'ENCODED:', encoded );

                const requestJSON = Buffer.from ( encoded, 'base64' ).toString ( 'utf8' );
                const request = JSON.parse ( requestJSON );

                if ( !request ) return false;
                if ( !request.key ) return false;
                if ( request.networkID !== this.appState.network.identity ) return false;

                console.log ( 'DECODED REQUEST:', request );

                // TODO: check key format and validity!

                return request;
            }
            catch ( error ) {
                console.log ( error );
            }
        }
        return false;
    }

    //----------------------------------------------------------------//
    virtual_composeBody ( fieldValues ) {

        const request = this.decodeRequest ();

        let body = {
            suffix:     this.fields.suffix.value,
            key:        request && request.key || false,
            grant:      this.fields.grant.value,
        };
        return body;
    }

    //----------------------------------------------------------------//
    @action
    virtual_validate () {

        const encoded = this.fields.request.value || '';

        if ( encoded.length > 0 ) {
            const request = this.decodeRequest ();
            if ( !request ) {
                this.fields.request.error = 'Problem decoding request.';
            }
        }
    }
}

//================================================================//
// TransactionFormController_PublishSchema
//================================================================//
export class TransactionFormController_PublishSchema extends TransactionFormController {

    //----------------------------------------------------------------//
    constructor ( appState ) {
        super ();

        const fieldsArray = [
            new FIELD_CLASS.TEXT    ( 'schema',         'Schema', 8 ),
        ];
        this.initialize ( appState, TRANSACTION_TYPE.PUBLISH_SCHEMA, fieldsArray );
    }

    //----------------------------------------------------------------//
    virtual_composeBody ( fieldValues ) {

        const body = {};
        if ( this.fields.schema.value ) {
            try {
                body.schema = JSON.parse ( this.fields.schema.value );
            }
            catch ( error ) {
            }
        }
        return body;
    }

    //----------------------------------------------------------------//
    @action
    virtual_validate () {

        try {
            this.fields.schema.value && JSON.parse ( this.fields.schema.value );
        }
        catch ( error ) {
            this.fields.schema.error  = 'Error parsing JSON.';
        }
    }
}

//================================================================//
// TransactionFormController_RegisterMiner
//================================================================//
export class TransactionFormController_RegisterMiner extends TransactionFormController {

    //----------------------------------------------------------------//
    constructor ( appState ) {
        super ();

        const fieldsArray = [
            new FIELD_CLASS.STRING      ( 'url',            'Miner URL' ),
        ];
        this.initialize ( appState, TRANSACTION_TYPE.REGISTER_MINER, fieldsArray );
    }
}

//================================================================//
// TransactionFormController_RenameAccount
//================================================================//
export class TransactionFormController_RenameAccount extends TransactionFormController {

    //----------------------------------------------------------------//
    constructor ( appState ) {
        super ();

        const fieldsArray = [
            new FIELD_CLASS.STRING      ( 'revealedName',   'New Name' ),
            // new FIELD_CLASS.STRING       ( 'secretName',     'Secret Name' ),
        ];
        this.initialize ( appState, TRANSACTION_TYPE.RENAME_ACCOUNT, fieldsArray );
    }

    //----------------------------------------------------------------//
    @computed get
    revealedName () {

        this.fields.revealedName && this.fields.revealedName.value || '';
    }

    //----------------------------------------------------------------//
    @computed get
    secretName () {
        
        this.fields.secretName && this.fields.secretName.value || '';
    }

    //----------------------------------------------------------------//
    virtual_composeBody ( fieldValues ) {

        let body = {
            revealedName: this.revealedName,
        };

        if ( this.fields.secretName ) {
            
            const makerAccountName  = this.makerAccountName;
            const secretName    = this.fields.secretName.value;

            body.nameHash       = sha256 ( secretName );
            body.nameSecret     = sha256 ( `${ makerAccountName }:${ secretName }` );
        }
        return body;
    }

    //----------------------------------------------------------------//
    @action
    virtual_validate () {
        
        const revealedName = this.revealedName;
        const secretName = this.secretName;

        this.isComplete = (
            ( revealedName && ( revealedName.length > 0 )) ||
            ( secretName && ( secretName.length > 0 ))
        );

        this.fieldErrors = {};

        const fieldErrors = this.fieldErrors;

        if ( this.makerAccountName === revealedName ) {
            this.fields.revealedName.error = 'Revealed name should be different from current account name.';
        }

        if ( secretName && ( secretName.length > 0 )) {
            if ( this.makerAccountName === secretName ) {
                this.fields.secretName.error = 'Secret name should be different from current account name.';
            }
            else if ( secretName === revealedName ) {
                this.fields.secretName.error = 'Secret name should be different from revealed name.';
            }
        }
    }
};

//================================================================//
// TransactionFormController_SendVol
//================================================================//
export class TransactionFormController_SendVol extends TransactionFormController {

    //----------------------------------------------------------------//
    constructor ( appState ) {
        super ();

        const fieldsArray = [
            new FIELD_CLASS.STRING      ( 'accountName',    'Recipient' ),
            new FIELD_CLASS.INTEGER     ( 'amount',         'Amount' ),
        ];
        this.initialize ( appState, TRANSACTION_TYPE.SEND_VOL, fieldsArray );
    }

    //----------------------------------------------------------------//
    @action
    virtual_validate () {

        if ( this.makerAccountName === this.fields.accountName.value ) {
            this.fields.accountName.error = 'Maker cannot also be recipient.';
        }

        if ( this.fields.amount.value === 0 ) {
            this.fields.amount.error = 'Pick a non-zero amount.';
        }
    }
};

//================================================================//
// TransactionFormController_UpgradeAssets
//================================================================//
export class TransactionFormController_UpgradeAssets extends TransactionFormController {

    //----------------------------------------------------------------//
    constructor ( appState, upgradeMap ) {
        super ();

        const fieldsArray = [
            new FIELD_CLASS.CONST       ( 'upgrades', 'Upgrades', upgradeMap ),
        ];
        this.initialize ( appState, TRANSACTION_TYPE.UPGRADE_ASSETS, fieldsArray );
    }
}
