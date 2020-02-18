// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { Transaction, TRANSACTION_TYPE }    from './Transaction';
import { TransactionFormController }        from './TransactionFormController';
import { FIELD_CLASS }                      from './TransactionFormFieldControllers';
import { assert, randomBytes, util }        from 'fgc';
import _                                    from 'lodash';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';

//================================================================//
// TransactionFormController_PublishSchema
//================================================================//
export class TransactionFormController_PublishSchema extends TransactionFormController {

    //----------------------------------------------------------------//
    constructor ( appState ) {
        super ();

        const fieldsArray = [
            new FIELD_CLASS.SCHEMA  ( 'schema',     'Schema' ),
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
