// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                          from '../fields/fields'
import { TRANSACTION_TYPE }                 from './Transaction';
import { TransactionFormController }        from './TransactionFormController';
import _                                    from 'lodash';
import { action, observable }               from 'mobx';

//================================================================//
// PublishSchemaFormController
//================================================================//
export class PublishSchemaFormController extends TransactionFormController {

    @observable deckName = '';

    //----------------------------------------------------------------//
    constructor ( accountService, andReset ) {
        super ();

        this.isPublishAndReset = Boolean ( andReset );
        this.checkSchema = !this.isPublishAndReset;

        // TODO: using a field for this is just silly; refactor into its own view (like the crafting form.)
        const fieldsArray = [
            new Fields.SchemaFieldController    ( 'schema' ),
        ];

        const transactionType = andReset ? TRANSACTION_TYPE.PUBLISH_SCHEMA_AND_RESET : TRANSACTION_TYPE.PUBLISH_SCHEMA;
        this.initialize ( accountService, transactionType, fieldsArray );
    }

    //----------------------------------------------------------------//
    @action
    setDeckName ( deckName ) {
        this.deckName = deckName;
        this.validate ();
    }

    //----------------------------------------------------------------//
    virtual_composeBody () {

        const body = {};
        
        if ( this.isPublishAndReset ) {
            body.deckName = this.deckName;
        }
        body.schema = this.fields.schema.schema;
        return body;
    }

    //----------------------------------------------------------------//
    @action
    virtual_validate () {

        try {

            if ( this.fields.schema.schema ) {

                const schema = this.fields.schema.schema;
            
                const size =
                    Object.keys ( schema.decks ).length +
                    Object.keys ( schema.definitions ).length +
                    Object.keys ( schema.fonts ).length +
                    Object.keys ( schema.icons ).length +
                    Object.keys ( schema.layouts ).length +
                    Object.keys ( schema.methods ).length +
                    Object.keys ( schema.rewards ).length +
                    Object.keys ( schema.upgrades ).length +
                    Object.keys ( schema.sets ).sets
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
