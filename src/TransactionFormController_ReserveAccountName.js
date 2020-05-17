// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { Transaction, TRANSACTION_TYPE }    from './Transaction';
import { TransactionFormController }        from './TransactionFormController';
import { checkName }                        from './TransactionFormController_RenameAccount';
import { FIELD_CLASS }                      from './TransactionFormFieldControllers';
import { assert, crypto, util }             from 'fgc';
import _                                    from 'lodash';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';

//================================================================//
// TransactionFormController_ReserveAccountName
//================================================================//
export class TransactionFormController_ReserveAccountName extends TransactionFormController {

    //----------------------------------------------------------------//
    constructor ( appState ) {
        super ();

        const fieldsArray = [
            new FIELD_CLASS.STRING      ( 'secretName',     'Reserve Name' ),
        ];
        this.initialize ( appState, TRANSACTION_TYPE.RESERVE_ACCOUNT_NAME, fieldsArray );
    }

    //----------------------------------------------------------------//
    @computed get
    secretName () {
        
        return this.fields.secretName && this.fields.secretName.value || '';
    }

    //----------------------------------------------------------------//
    virtual_composeBody ( fieldValues ) {

        const secretNameLower   = this.secretName.toLowerCase ();
        const accountNameLower  = this.makerAccountName.toLowerCase ();

        return {
            nameHash:       crypto.sha256 ( secretNameLower ),
            nameSecret:     crypto.sha256 ( `${ accountNameLower }:${ secretNameLower }` ),
        };
    }

    //----------------------------------------------------------------//
    @action
    virtual_validate () {
        
        const secretName = this.secretName;
        this.isComplete = Boolean ( secretName );

        this.fieldErrors = {};
        const fieldErrors = this.fieldErrors;

        if ( secretName.length > 0 ){
            const nameErr = checkName ( secretName );
            if ( nameErr !== false ) {
                this.fields.secretName.error = nameErr;
            }
        }

        if ( this.makerAccountName.toLowerCase () === secretName.toLowerCase ()) {
            this.fields.secretName.error = 'New name should be different from current account name.';
        }
    }
};
