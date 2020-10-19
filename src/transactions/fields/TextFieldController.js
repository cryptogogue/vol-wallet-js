// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { TransactionFormFieldController } from './TransactionFormFieldController'
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';

//================================================================//
// TextFieldController
//================================================================//
export class TextFieldController extends TransactionFormFieldController {

    //----------------------------------------------------------------//
    constructor ( fieldName, friendlyName, rows, defaultValue, initialValue ) {
        super ( fieldName, friendlyName, defaultValue, initialValue );
        this.rows = rows;
    }
}
