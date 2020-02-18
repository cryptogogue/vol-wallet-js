// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';

//================================================================//
// TransactionFormFieldController
//================================================================//
export class TransactionFormFieldController {

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
    get isComplete () {
        return ( this.inputString || !this.isRequired );
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
    setInputString ( inputString ) {

        this.inputString = String ( inputString ) || '';
    }

    //----------------------------------------------------------------//
    virtual_coerce ( inputValue ) {
        return inputValue;
    }

    //----------------------------------------------------------------//
    virtual_format ( value ) {
        return value;
    }
}

//================================================================//
// TransactionFormFieldController_AccountKey
//================================================================//
export class TransactionFormFieldController_AccountKey extends TransactionFormFieldController {

    //----------------------------------------------------------------//
    constructor ( fieldName, friendlyName, value ) {
        super ( fieldName, friendlyName, value );
    }
}

//================================================================//
// TransactionFormFieldController_AssetSelection
//================================================================//
export class TransactionFormFieldController_AssetSelection extends TransactionFormFieldController {

    //----------------------------------------------------------------//
    constructor ( fieldName, friendlyName, value ) {
        super ( fieldName, friendlyName, value );
    }

    //----------------------------------------------------------------//
    virtual_format ( value ) {
        return Object.keys ( value );
    }
}

//================================================================//
// TransactionFormFieldController_Const
//================================================================//
export class TransactionFormFieldController_Const extends TransactionFormFieldController {

    //----------------------------------------------------------------//
    constructor ( fieldName, friendlyName, value ) {
        super ( fieldName, friendlyName, value );
    }
}

//================================================================//
// TransactionFormFieldController_CryptoKey
//================================================================//
export class TransactionFormFieldController_CryptoKey extends TransactionFormFieldController {

    //----------------------------------------------------------------//
    constructor ( fieldName, friendlyName, rows, defaultValue, initialValue ) {
        super ( fieldName, friendlyName, defaultValue, initialValue );
        this.rows = rows;
    }
}

//================================================================//
// TransactionFormFieldController_Integer
//================================================================//
export class TransactionFormFieldController_Integer extends TransactionFormFieldController {

    //----------------------------------------------------------------//
    constructor ( fieldName, friendlyName, defaultValue, initialValue ) {
        super ( fieldName, friendlyName, defaultValue, initialValue );
    }

    //----------------------------------------------------------------//
    virtual_coerce ( inputValue ) {
        return Number ( inputValue );
    }
}

//================================================================//
// TransactionFormFieldController_Schema
//================================================================//
export class TransactionFormFieldController_Schema extends TransactionFormFieldController {

    //----------------------------------------------------------------//
    constructor ( fieldName, friendlyName, defaultValue, initialValue ) {
        super ( fieldName, friendlyName, defaultValue, initialValue );
    }
}

//================================================================//
// TransactionFormFieldController_String
//================================================================//
export class TransactionFormFieldController_String extends TransactionFormFieldController {

    //----------------------------------------------------------------//
    constructor ( fieldName, friendlyName, defaultValue, initialValue ) {
        super ( fieldName, friendlyName, defaultValue, initialValue );
    }
}

//================================================================//
// TransactionFormFieldController_Text
//================================================================//
export class TransactionFormFieldController_Text extends TransactionFormFieldController {

    //----------------------------------------------------------------//
    constructor ( fieldName, friendlyName, rows, defaultValue, initialValue ) {
        super ( fieldName, friendlyName, defaultValue, initialValue );
        this.rows = rows;
    }
}

export const FIELD_CLASS = {
    ACCOUNT_KEY:        TransactionFormFieldController_AccountKey,
    ASSET_SELECTION:    TransactionFormFieldController_AssetSelection,
    CONST:              TransactionFormFieldController_Const,
    CRYPTO_KEY:         TransactionFormFieldController_CryptoKey,
    INTEGER:            TransactionFormFieldController_Integer,
    SCHEMA:             TransactionFormFieldController_Schema,
    STRING:             TransactionFormFieldController_String,
    TEXT:               TransactionFormFieldController_Text,
}
