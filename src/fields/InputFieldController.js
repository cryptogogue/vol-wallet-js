// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { FieldController } from './FieldController'
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';

//================================================================//
// InputFieldController
//================================================================//
export class InputFieldController extends FieldController {

    //----------------------------------------------------------------//
    constructor ( fieldName, defaultValue, initialValue ) {
        super ( fieldName );

        this.defaultValue = defaultValue;

        extendObservable ( this, {
            inputValue:     initialValue,
        });
    }

    //----------------------------------------------------------------//
    @computed get
    inputString () {
        return this.inputValue !== undefined ? this.virtual_toString ( this.inputValue ) : '';
    }

    //----------------------------------------------------------------//
    @action
    setInputString ( value ) {
        this.inputValue = value ? this.virtual_fromString ( value ) : undefined;
        this.update ();
    }

    //----------------------------------------------------------------//
    @computed get
    value () {
        return this.inputValue || this.defaultValue;
    }

    //----------------------------------------------------------------//
    virtual_isComplete () {
        return (( this.value !== undefined ) || ( this.defaultValue !== undefined ));
    }

    //----------------------------------------------------------------//
    virtual_toTransactionFieldValue () {
        return this.value;
    }
}
