// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { InputFieldController } from './InputFieldController'
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';

//================================================================//
// StringFieldController
//================================================================//
export class StringFieldController extends InputFieldController {

    //----------------------------------------------------------------//
    constructor ( fieldName, defaultValue, initialValue ) {
        super ( fieldName, defaultValue, initialValue );
    }

    //----------------------------------------------------------------//
    virtual_fromString ( value ) {
        return value;
    }

    //----------------------------------------------------------------//
    virtual_toString ( value ) {
        return value;
    }
}
