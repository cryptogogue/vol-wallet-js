// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { Transaction, TRANSACTION_TYPE }    from './Transaction';
import { TransactionFormController }        from './TransactionFormController';
import { FIELD_CLASS }                      from './TransactionFormFieldControllers';
import { assert, randomBytes, util }        from 'fgc';
import _                                    from 'lodash';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';

//================================================================//
// TransactionFormController_AffirmKey
//================================================================//
export class TransactionFormController_AffirmKey extends TransactionFormController {

    //----------------------------------------------------------------//
    constructor ( appState ) {
        super ();

        const fieldsArray = [
            new FIELD_CLASS.STRING      ( 'keyName',        'Key Name' ),
            new FIELD_CLASS.STRING      ( 'key',            'Key' ),
            new FIELD_CLASS.STRING      ( 'policyName',     'Policy' ),
        ];
        this.initialize ( appState, TRANSACTION_TYPE.AFFIRM_KEY, fieldsArray );
    }
}
