// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { FieldController } from './FieldController'
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';

//================================================================//
// VOLFieldController
//================================================================//
export class VOLFieldController extends FieldController {

    //----------------------------------------------------------------//
    constructor ( fieldName, friendlyName, defaultValue, initialValue ) {
        super ( fieldName, friendlyName, defaultValue, initialValue );
    }

    //----------------------------------------------------------------//
    virtual_coerce ( inputValue ) {
        return parseFloat ( inputValue ) * 1000;
    }

    //----------------------------------------------------------------//
    virtual_validate () {

        if ( !this.hasValue ) return;

        if ( this.value < 0 ) {
            this.error = 'Cannot be a negative number.';
        }
    }
}