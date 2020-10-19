// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { TransactionFormFieldController } from './TransactionFormFieldController'
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';

//================================================================//
// AccountKeyFieldController
//================================================================//
export class AccountKeyFieldController extends TransactionFormFieldController {

    //----------------------------------------------------------------//
    constructor ( fieldName, friendlyName, value ) {
        super ( fieldName, friendlyName, value );
    }
}
