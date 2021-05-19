// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { FieldController } from './FieldController'
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';

//================================================================//
// SchemaFieldController
//================================================================//
export class SchemaFieldController extends FieldController {

    @observable schema      = false;

    //----------------------------------------------------------------//
    constructor ( fieldName, friendlyName ) {
        super ( fieldName, friendlyName );
    }

    //----------------------------------------------------------------//
    @action
    setSchema ( schema ) {
        this.schema = schema || false;
        this.update ();
    }

    //----------------------------------------------------------------//
    virtual_isComplete () {
        return Boolean ( this.schema );
    }

    //----------------------------------------------------------------//
    @action
    virtual_validate () {

        if ( this.schema ) {
            
            const size =
                Object.keys ( this.schema.decks ).length +
                Object.keys ( this.schema.definitions ).length +
                Object.keys ( this.schema.fonts ).length +
                Object.keys ( this.schema.icons ).length +
                Object.keys ( this.schema.layouts ).length +
                Object.keys ( this.schema.methods ).length +
                Object.keys ( this.schema.rewards ).length +
                Object.keys ( this.schema.upgrades ).length +
                Object.keys ( this.schema.sets ).sets
            ;

            if ( size === 0 ) {
                this.error = 'Schema contains no new content.';
            }
        }
    }

    //----------------------------------------------------------------//
    virtual_toTransactionFieldValue () {
        return JSON.stringify ( this.schema );
    }
}