// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { FieldController } from './FieldController'
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';

//================================================================//
// AssetSelectionFieldController
//================================================================//
export class AssetSelectionFieldController extends FieldController {

    //----------------------------------------------------------------//
    constructor ( fieldName, friendlyName, value ) {
        super ( fieldName, friendlyName, value );
    }

    //----------------------------------------------------------------//
    virtual_format ( value ) {
        return Object.keys ( value );
    }
}
