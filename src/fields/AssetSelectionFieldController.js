// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { FieldController } from './FieldController'
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';

//================================================================//
// AssetSelectionFieldController
//================================================================//
export class AssetSelectionFieldController extends FieldController {

    //----------------------------------------------------------------//
    constructor ( fieldName, assets ) {
        super ( fieldName, );

        extendObservable ( this, {
            assets:     assets || {},
        });
    }

    //----------------------------------------------------------------//
    @computed get
    assetIDs () {
        return Object.keys ( this.assets );
    }

    //----------------------------------------------------------------//
    virtual_toTransactionFieldValue () {
        return this.assetIDs;
    }
}
