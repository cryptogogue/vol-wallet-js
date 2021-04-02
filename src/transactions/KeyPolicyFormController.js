// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields 							from '../fields/fields'
import { Transaction, TRANSACTION_TYPE }    from './Transaction';
import { TransactionFormController }        from './TransactionFormController';
import { assert, randomBytes, util }        from 'fgc';
import _                                    from 'lodash';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';

//================================================================//
// KeyPolicyFormController
//================================================================//
export class KeyPolicyFormController extends TransactionFormController {

    //----------------------------------------------------------------//
    constructor ( accountService ) {
        super ();

        const fieldsArray = [
            new Fields.StringFieldController	( 'policyName',     'Policy Name' ),
            new Fields.TextFieldController		( 'policy',         'Policy', 8 ),
        ];
        this.initialize ( accountService, TRANSACTION_TYPE.KEY_POLICY, fieldsArray );
    }
}
