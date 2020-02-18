// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { Transaction, TRANSACTION_TYPE }    from './Transaction';
import { TransactionFormController }        from './TransactionFormController';
import { FIELD_CLASS }                      from './TransactionFormFieldControllers';
import { assert, randomBytes, util }        from 'fgc';
import _                                    from 'lodash';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';

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

        return this.fields.revealedName && this.fields.revealedName.value || '';
    }

    //----------------------------------------------------------------//
    @computed get
    secretName () {
        
        return this.fields.secretName && this.fields.secretName.value || '';
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

        this.isComplete = ( revealedName || secretName );

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
