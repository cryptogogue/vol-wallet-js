// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { FieldController }                  from './FieldController'
import { crypto }                           from 'fgc';
import { action, observable, runInAction }  from 'mobx';

//================================================================//
// JSONFieldController
//================================================================//
export class JSONFieldController extends FieldController {

    @observable     jsonText            = '';
    @observable     json                = null;

    //----------------------------------------------------------------//
    constructor ( fieldName ) {
        super ( fieldName );
    }

    //----------------------------------------------------------------//
    @action
    setJSONText ( jsonText ) {
        this.jsonText = jsonText;
        this.json = null;
    }
    
    //----------------------------------------------------------------//
    virtual_isComplete () {
        return Boolean ( this.json );
    }

    //----------------------------------------------------------------//
    virtual_toTransactionFieldValue () {
        console.log ( 'TX FIELD VALUE:', this.json );
        return this.json;
    }

    //----------------------------------------------------------------//
    @action
    virtual_validate () {

        this.json = null;

        if ( this.jsonText ) {
            try {
                this.json = JSON.parse ( this.jsonText );
            }
            catch ( error ) {
                this.setError ( 'Invalid JSON.' );
            }
        }
    }
}
