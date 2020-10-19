// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { TransactionFormFieldController } from './TransactionFormFieldController'
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';

//================================================================//
// SchemaFieldController
//================================================================//
export class SchemaFieldController extends TransactionFormFieldController {

    //----------------------------------------------------------------//
    constructor ( fieldName, friendlyName, defaultValue, initialValue ) {
        super ( fieldName, friendlyName, defaultValue, initialValue );
    }
}