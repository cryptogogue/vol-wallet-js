// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { InputFieldController }             from './InputFieldController'
import * as vol                             from '../util/vol';

//================================================================//
// VOLFieldController
//================================================================//
export class VOLFieldController extends InputFieldController {

    //----------------------------------------------------------------//
    constructor ( fieldName, defaultValue, initialValue ) {
        super ( fieldName, defaultValue, initialValue );
    }

    //----------------------------------------------------------------//
    virtual_fromString ( value ) {
        value = parseFloat ( value );
        return isNaN ( value ) ? undefined : Math.floor ( value * 1000 );
    }

    //----------------------------------------------------------------//
    virtual_toString ( value ) {
        return vol.format ( value );
    }

    //----------------------------------------------------------------//
    virtual_validate () {

        if ( this.inputValue === undefined ) return;

        if ( this.value < 0 ) {
            this.error = 'Cannot be a negative number.';
        }
    }
}