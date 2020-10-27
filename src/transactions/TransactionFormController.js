// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                          from '../fields/fields'
import { Transaction, TRANSACTION_TYPE }    from './Transaction';
import { assert, excel, hooks, randomBytes, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import _                                    from 'lodash';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';

const SPECIAL_FIELDS = [
    'gratuity',
    'makerKeyName',
];

// TODO: factor common functionality out into the fields module 

//================================================================//
// TransactionFormController
//================================================================//
export class TransactionFormController {

    @observable     standalone      = false;
    @observable     cost            = 0;
    @observable     weight          = 0;

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
    @action
    initialize ( appState, type, fieldsArray ) {

        this.standalone             = Boolean ( appState.isStandaloneTransactionContext ); // yes, this is a hack. but not worth refactoring over.

        console.log ( 'IS STANDALONE', this.standalone );

        this.appState               = appState;
        this.type                   = type;

        fieldsArray = fieldsArray || [];

        fieldsArray.push ( new Fields.VOLFieldController ( 'gratuity',       'Gratuity', 0 ));

        if ( !this.standalone ) {
            console.log ( 'HELLO ACCOUNT KEY' );
            fieldsArray.push ( new Fields.AccountKeyFieldController ( 'makerKeyName',   'Maker Key', appState.getDefaultAccountKeyName ()));
        }

        const fields = {};
        for ( let field of fieldsArray ) {
            field.controller            = this;
            fields [ field.fieldName ]  = field;
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
    @computed get
    makerAccountName () {

        return this.appState.accountID;
    }

    //----------------------------------------------------------------//
    makeTransaction () {

        const transaction = Transaction.transactionWithBody ( this.type, this.makeTransactionBody ());
        this.virtual_decorateTransaction ( transaction );
        return transaction;
    }

    //----------------------------------------------------------------//
    makeTransactionBody () {

        const body = this.virtual_composeBody ();
        body.maker = {
            gratuity:           this.fields.gratuity.value,
            accountName:        this.standalone ? '' : this.makerAccountName,
            keyName:            this.standalone ? '' : this.fields.makerKeyName.value,
            nonce:              -1,
        }
        return body;
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
        if ( !this.standalone ) {
            if ( this.appState.balance < this.cost ) {
                this.isErrorFree = false;
            }
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
