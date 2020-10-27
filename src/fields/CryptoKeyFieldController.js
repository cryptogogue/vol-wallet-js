// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { FieldController } from './FieldController'
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';

//================================================================//
// CryptoKeyFieldController
//================================================================//
export class CryptoKeyFieldController extends FieldController {

	@observable key = false;

    //----------------------------------------------------------------//
    constructor ( fieldName, friendlyName, rows, defaultValue, initialValue ) {
        super ( fieldName, friendlyName, defaultValue, initialValue );
        this.rows = rows;
    }

    //----------------------------------------------------------------//
    @action
    setKey ( key ) {
    	this.key = key;
    }

    //----------------------------------------------------------------//
    virtual_coerce ( inputValue ) {
        return ( this.inputString === inputValue ) ? this.key : false;
    }
}
