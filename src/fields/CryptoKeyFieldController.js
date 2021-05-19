// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { FieldController } from './FieldController'
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';

//================================================================//
// CryptoKeyFieldController
//================================================================//
export class CryptoKeyFieldController extends FieldController {

    @observable     phraseOrKey         = '';
    @observable     key                 = false;

    //----------------------------------------------------------------//
    constructor ( fieldName ) {
        super ( fieldName );
    }

    //----------------------------------------------------------------//
    @action
    async loadKeyAsync ( phraseOrKey ) {
    	
        this.phraseOrKey = phraseOrKey;
        this.key = false;

        if ( phraseOrKey ) {

            try {
                const key = await crypto.loadKeyAsync ( phraseOrKey );
                runInAction (() => {
                    this.key = key;
                });
            }
            catch ( error ) {
                this.setError ( 'Invalid Phrase or Key.' );
            }
        }
        this.update ();
    }

    //----------------------------------------------------------------//
    virtual_isComplete () {
        return Boolean ( this.key );
    }

    //----------------------------------------------------------------//
    virtual_toTransactionFieldValue () {
        return this.phraseOrKey;
    }
}
