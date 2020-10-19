// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { TransactionFormFieldController } from './TransactionFormFieldController'
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';

//================================================================//
// ConstFieldController
//================================================================//
export class ConstFieldController extends TransactionFormFieldController {

    //----------------------------------------------------------------//
    constructor ( fieldName, friendlyName, value ) {
        super ( fieldName, friendlyName, value );
    }
}
