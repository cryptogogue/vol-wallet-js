// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { InputFieldController } from './InputFieldController'
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';

//================================================================//
// IntegerFieldController
//================================================================//
export class IntegerFieldController extends InputFieldController {

    //----------------------------------------------------------------//
    constructor ( fieldName, defaultValue, initialValue ) {
        super ( fieldName, defaultValue, initialValue );
    }

    //----------------------------------------------------------------//
    virtual_fromString ( value ) {
        value = parseInt ( value );
        return isNaN ( value ) ? undefined : value;
    }

    //----------------------------------------------------------------//
    virtual_toString ( value ) {
        return String ( value );
    }
}
