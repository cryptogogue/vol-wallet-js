// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { Transaction, TRANSACTION_TYPE }    from './Transaction';
import { TransactionFormController }        from './TransactionFormController';
import { FIELD_CLASS }                      from './TransactionFormFieldControllers';
import { assert, randomBytes, util }        from 'fgc';
import _                                    from 'lodash';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';

//================================================================//
// TransactionFormController_HardReset
//================================================================//
export class TransactionFormController_HardReset extends TransactionFormController {

    //----------------------------------------------------------------//
    constructor ( appState ) {
        super ();

        this.initialize ( appState, TRANSACTION_TYPE.HARD_RESET );
    }
}
