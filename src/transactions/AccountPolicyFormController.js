// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                          from '../fields/fields'
import { Transaction, TRANSACTION_TYPE }    from './Transaction';
import { TransactionFormController }        from './TransactionFormController';
import { assert, randomBytes, util }        from 'fgc';
import _                                    from 'lodash';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';

//================================================================//
// AccountPolicyFormController
//================================================================//
export class AccountPolicyFormController extends TransactionFormController {

    //----------------------------------------------------------------//
    constructor ( accountService ) {
        super ();

        const fieldsArray = [
            new Fields.StringFieldController	( 'policyName' ),
            new Fields.StringFieldController    ( 'policy' ),
        ];
        this.initialize ( accountService, TRANSACTION_TYPE.ACCOUNT_POLICY, fieldsArray );
    }
}
