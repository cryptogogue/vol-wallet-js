// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                          from '../fields/fields'
import { Transaction, TRANSACTION_TYPE }    from './Transaction';
import { assert, excel, hooks, randomBytes, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import _                                    from 'lodash';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';

//const debugLog = function () {}
const debugLog = function ( ...args ) { console.log ( '@TX FORM:', ...args ); }

const SPECIAL_FIELDS = [
    'gratuity',
    'makerKeyName',
];

// TODO: factor common functionality out into the fields module 

//================================================================//
// TransactionFormController
//================================================================//
export class TransactionFormController {

    @observable     standalone              = false;

    @computed get balance                   () { return this.accountService.balance - this.cost; }
    @computed get cost                      () { return this.transaction ? this.transaction.cost : 0; }
    @computed get friendlyName              () { return Transaction.friendlyNameForType ( this.type ); }
    @computed get suggestedGratuity         () { return this.accountService.getMinimumGratuity () * this.weight; }
    @computed get weight                    () { return this.transaction ? this.transaction.weight : 0; }

    //----------------------------------------------------------------//
    constructor () {

        this.revocable = new RevocableContext ();
    }

    //----------------------------------------------------------------//
    finalize () {

        this.revocable.finalize ();
    }

    //----------------------------------------------------------------//
    formatBody () {
        
        let result = {};
        for ( let field of this.fieldsArray ) {
            const fieldName = field.fieldName;
            if ( !SPECIAL_FIELDS.includes ( fieldName )) {
                result [ fieldName ] = field.transactionFieldValue;
            }
        }
        return result;
    }

    //----------------------------------------------------------------//
    @action
    initialize ( accountService, type, fieldsArray ) {

        assert ( accountService );

        this.standalone             = Boolean ( accountService.isStandaloneTransactionContext ); // yes, this is a hack. but not worth refactoring over.

        this.accountService         = accountService;
        this.networkService         = accountService.networkService;
        this.appState               = accountService.appState;
        this.type                   = type;

        fieldsArray = fieldsArray || [];

        fieldsArray.push ( new Fields.VOLFieldController ( 'gratuity', 0 ));

        if ( !this.standalone ) {
            fieldsArray.push ( new Fields.AccountKeyFieldController ( accountService, 'makerKeyName', accountService.getDefaultAccountKeyName ()));
        }
        else {
            // these get calculated automatically if not standalone
            fieldsArray.push ( new Fields.VOLFieldController ( 'profitShare', 0 ));
            fieldsArray.push ( new Fields.VOLFieldController ( 'transferTax', 0 ));
        }

        const fields = {};
        for ( let field of fieldsArray ) {
            field.formController        = this;
            field.accountService        = accountService;
            field.networkService        = accountService.networkService;
            field.appState              = accountService.appState;
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

        return this.accountService.accountID;
    }

    //----------------------------------------------------------------//
    makeTransaction () {

        debugLog ( 'makeTransaction' );

        const transaction = Transaction.fromBody ( this.makeTransactionBody ());
        transaction.setFees ( this.accountService.getFeeSchedule ());
        this.virtual_decorateTransaction ( transaction );

        return transaction;
    }

    //----------------------------------------------------------------//
    makeTransactionBody () {

        const body  = this.virtual_composeBody ();
        body.type   = this.type;

        body.maker = {
            gratuity:           this.fields.gratuity.transactionFieldValue,
            profitShare:        this.standalone ? this.fields.profitShare.transactionFieldValue : 0,
            transferTax:        this.standalone ? this.fields.transferTax.transactionFieldValue : 0,
            accountName:        this.standalone ? '' : this.makerAccountName,
            keyName:            this.standalone ? '' : this.fields.makerKeyName.transactionFieldValue,
            nonce:              -1,
        }
        return body;
    }

    //----------------------------------------------------------------//
    @action
    validate () {

        this.transaction = this.makeTransaction ();

        // check for completion
        this.isComplete = this.virtual_checkComplete ();
        for ( let field of this.fieldsArray ) {
            if ( !field.isComplete ) {
                this.isComplete = false;
                break;
            }
        }

        this.isErrorFree = true;

        // reset errors
        for ( let field of this.fieldsArray ) {
            field.error = false;
            field.validate ();
        }

        // check error free
        this.virtual_validate ();
        for ( let field of this.fieldsArray ) {
            if ( field.error ) {
                this.isErrorFree = false;
                break;
            }
        }

        // check balance
        if ( !this.standalone ) {
            if ( this.accountService.balance < this.cost ) {
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
