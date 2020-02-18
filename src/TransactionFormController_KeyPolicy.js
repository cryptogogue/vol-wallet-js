// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { Transaction, TRANSACTION_TYPE }    from './Transaction';
import { TransactionFormController }        from './TransactionFormController';
import { FIELD_CLASS }                      from './TransactionFormFieldControllers';
import { assert, randomBytes, util }        from 'fgc';
import _                                    from 'lodash';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';

//================================================================//
// TransactionFormController_KeyPolicy
//================================================================//
export class TransactionFormController_KeyPolicy extends TransactionFormController {

    //----------------------------------------------------------------//
    constructor ( appState ) {
        super ();

        const fieldsArray = [
            new FIELD_CLASS.STRING      ( 'policyName',     'Policy Name' ),
            new FIELD_CLASS.TEXT        ( 'policy',         'Policy', 8 ),
        ];
        this.initialize ( appState, TRANSACTION_TYPE.KEY_POLICY, fieldsArray );
    }
}
