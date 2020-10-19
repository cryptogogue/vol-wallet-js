// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                          from './fields/transaction-fields'
import { Transaction, TRANSACTION_TYPE }    from './Transaction';
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

    @observable     cost    = 0;
    @observable     weight  = 0;

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
            new Fields.FIELD_CLASS.VOL             ( 'gratuity',       'Gratuity', 0 ),
            new Fields.FIELD_CLASS.ACCOUNT_KEY     ( 'makerKeyName',   'Maker Key', appState.getDefaultAccountKeyName ()),
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
        this.weight         = this.transaction.getWeight ();

        // check for completion
        this.isComplete = this.virtual_checkComplete ();
        for ( let field of this.fieldsArray ) {
            if ( !field.isComplete ) {
                this.isComplete = false;
                break;
            }
        }

        // reset errors
        for ( let field of this.fieldsArray ) {
            field.error = false;
            field.validate ();
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
    virtual_checkComplete () {

        return true;
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
