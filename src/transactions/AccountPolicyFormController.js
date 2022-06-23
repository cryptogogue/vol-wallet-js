// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                          from '../fields/fields'
import { TransactionFormController }        from './TransactionFormController';
import _                                    from 'lodash';
import { TRANSACTION_TYPE }                 from 'vol';

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
