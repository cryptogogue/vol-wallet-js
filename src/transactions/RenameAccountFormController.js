// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                          from './fields/transaction-fields'
import { Transaction, TRANSACTION_TYPE }    from './Transaction';
import { TransactionFormController }        from './TransactionFormController';
import { assert, randomBytes, util }        from 'fgc';
import _                                    from 'lodash';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';

const ACCOUNT_NAME_REGEX = /^(?!\.)[0-9a-zA-Z\-.]*$/;

//----------------------------------------------------------------//
export function checkName ( name ) {
    if ( name.charAt ( 0 ) === '.' ) {
        return 'New name cannot start with a dot.';
    }
    else if ( !ACCOUNT_NAME_REGEX.test ( name )) {
        return 'New name contains illegal characters.';
    }
    return false;
}

//================================================================//
// RenameAccountFormController
//================================================================//
export class RenameAccountFormController extends TransactionFormController {

    //----------------------------------------------------------------//
    constructor ( appState ) {
        super ();

        const fieldsArray = [
            new Fields.FIELD_CLASS.STRING      ( 'revealedName',   'New Name' ),
        ];
        this.initialize ( appState, TRANSACTION_TYPE.RENAME_ACCOUNT, fieldsArray );
    }

    //----------------------------------------------------------------//
    @computed get
    revealedName () {

        return this.fields.revealedName && this.fields.revealedName.value || '';
    }

    //----------------------------------------------------------------//
    virtual_composeBody ( fieldValues ) {

        return {
            revealedName: this.revealedName,
        };
    }

    //----------------------------------------------------------------//
    @action
    virtual_validate () {
        
        const revealedName = this.revealedName;
        this.isComplete = Boolean ( revealedName );

        this.fieldErrors = {};
        const fieldErrors = this.fieldErrors;

        if ( revealedName.length > 0 ){
            const nameErr = checkName ( revealedName );
            if ( nameErr !== false ) {
                this.fields.revealedName.error = nameErr;
            }
        }

        if ( this.makerAccountName.toLowerCase () === revealedName.toLowerCase ()) {
            this.fields.revealedName.error = 'New name should be different from current account name.';
        }
    }
};
