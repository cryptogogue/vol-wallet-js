// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                          from '../fields/fields'
import { Transaction, TRANSACTION_TYPE }    from './Transaction';
import { TransactionFormController }        from './TransactionFormController';
import { checkName }                        from './RenameAccountFormController';
import { assert, crypto, util }             from 'fgc';
import _                                    from 'lodash';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';

//================================================================//
// ReserveAccountNameFormController
//================================================================//
export class ReserveAccountNameFormController extends TransactionFormController {

    //----------------------------------------------------------------//
    constructor ( accountService ) {
        super ();

        const fieldsArray = [
            new Fields.StringFieldController    ( 'secretName' ),
        ];
        this.initialize ( accountService, TRANSACTION_TYPE.RESERVE_ACCOUNT_NAME, fieldsArray );
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
