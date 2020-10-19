// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { TransactionFormFieldController } from './TransactionFormFieldController'
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';

//================================================================//
// AssetSelectionFieldController
//================================================================//
export class AssetSelectionFieldController extends TransactionFormFieldController {

    //----------------------------------------------------------------//
    constructor ( fieldName, friendlyName, value ) {
        super ( fieldName, friendlyName, value );
    }

    //----------------------------------------------------------------//
    virtual_format ( value ) {
        return Object.keys ( value );
    }
}
