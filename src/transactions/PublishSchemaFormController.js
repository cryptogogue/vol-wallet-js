// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                          from '../fields/fields'
import { Transaction, TRANSACTION_TYPE }    from './Transaction';
import { TransactionFormController }        from './TransactionFormController';
import { assert, randomBytes, util }        from 'fgc';
import _                                    from 'lodash';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';

//================================================================//
// PublishSchemaFormController
//================================================================//
export class PublishSchemaFormController extends TransactionFormController {

    @observable deckName = '';

    //----------------------------------------------------------------//
    constructor ( appState, andReset ) {
        super ();

        this.isPublishAndReset = Boolean ( andReset );
        this.checkSchema = !this.isPublishAndReset;

        // TODO: using a field for this is just silly; refactor into its own view (like the crafting form.)
        const fieldsArray = [
            new Fields.SchemaFieldController    ( 'schema',     'Schema' ),
        ];

        const transactionType = andReset ? TRANSACTION_TYPE.PUBLISH_SCHEMA_AND_RESET : TRANSACTION_TYPE.PUBLISH_SCHEMA;
        this.initialize ( appState, transactionType, fieldsArray );
    }

    //----------------------------------------------------------------//
    @action
    setDeckName ( deckName ) {
        this.deckName = deckName;
        this.validate ();
    }

    //----------------------------------------------------------------//
    virtual_composeBody ( fieldValues ) {

        const body = {};
        
        if ( this.isPublishAndReset ) {
            body.deckName = this.deckName;
        }

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

            if ( this.fields.schema.value ) {

                const schema = JSON.parse ( this.fields.schema.value );
            
                const size =
                    Object.keys ( schema.decks ).length +
                    Object.keys ( schema.definitions ).length +
                    Object.keys ( schema.fonts ).length +
                    Object.keys ( schema.icons ).length +
                    Object.keys ( schema.layouts ).length +
                    Object.keys ( schema.upgrades ).length +
                    Object.keys ( schema.sets ).sets +
                    Object.keys ( schema.methods ).length
                ;

                if ( size === 0 ) {
                    this.fields.schema.error = 'Schema contains no new content.';
                }
            }
        }
        catch ( error ) {
            this.fields.schema.error  = 'Error parsing JSON.';
        }
    }
}
