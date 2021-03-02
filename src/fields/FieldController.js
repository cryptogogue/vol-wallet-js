// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';

//================================================================//
// FieldController
//================================================================//
export class FieldController {

    //----------------------------------------------------------------//
    constructor ( fieldName, friendlyName, defaultValue, initialValue ) {

        this.fieldName      = fieldName;
        this.friendlyName   = friendlyName;
        this.isHidden       = false;
        this.defaultValue   = defaultValue,

        extendObservable ( this, {
            error:          false,
            inputString:    initialValue === undefined ? '' : String ( initialValue ),
        });
    }

    //----------------------------------------------------------------//
    @computed
    get hasValue () {
        return ( this.inputString !== '' );
    }

    //----------------------------------------------------------------//
    @computed
    get isComplete () {
        return ( this.hasValue || !this.isRequired );
    }

    //----------------------------------------------------------------//
    @computed
    get isRequired () {
        return ( this.defaultValue === undefined );
    }

    //----------------------------------------------------------------//
    @computed
    get value () {
        return this.virtual_format ( this.inputString ? this.virtual_coerce ( this.inputString ) : this.defaultValue );
    }

    //----------------------------------------------------------------//
    @action
    setError ( error ) {
        this.error = error;
    }

    //----------------------------------------------------------------//
    @action
    setInputString ( inputString ) {
        this.inputString = String ( inputString ) || '';
        this.formController && this.formController.validate ? this.formController.validate () : this.validate ();
    }

    //----------------------------------------------------------------//
    validate () {
        this.virtual_validate ();
    }

    //----------------------------------------------------------------//
    virtual_coerce ( inputValue ) {
        return inputValue;
    }

    //----------------------------------------------------------------//
    virtual_format ( value ) {
        return value;
    }

    //----------------------------------------------------------------//
    virtual_validate () {
    }
}
