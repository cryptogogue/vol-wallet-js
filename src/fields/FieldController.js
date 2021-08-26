// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { action, computed, observable } from 'mobx';

//================================================================//
// FieldController
//================================================================//
export class FieldController {

    @observable error       = false;

    //----------------------------------------------------------------//
    constructor ( fieldName ) {
        this.fieldName = fieldName;
    }

    //----------------------------------------------------------------//
    @computed get
    isComplete () {
        return this.virtual_isComplete ();
    }

    //----------------------------------------------------------------//
    @computed get
    isCompleteAndErrorFree () {
        return ( this.isComplete && ( this.error === false ));
    }

    //----------------------------------------------------------------//
    @action
    setError ( error ) {
        this.error = error;
    }

    //----------------------------------------------------------------//
    @computed get
    transactionFieldValue () {
        return this.isCompleteAndErrorFree ? this.virtual_toTransactionFieldValue () : undefined;
    }

    //----------------------------------------------------------------//
    update () {
        this.formController && this.formController.validate ? this.formController.validate () : this.validate ();
    }

    //----------------------------------------------------------------//
    @action
    validate () {
        this.error = false;
        this.virtual_validate ();
    }

    //----------------------------------------------------------------//
    virtual_isComplete () {
        return true;
    }

    //----------------------------------------------------------------//
    virtual_validate () {
    }
}
