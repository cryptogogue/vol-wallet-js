// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                          from '../fields/fields'
import { TransactionFormController }        from './TransactionFormController';
import _                                    from 'lodash';
import { TRANSACTION_TYPE }                 from 'vol';

//================================================================//
// AffirmKeyFormController
//================================================================//
export class AffirmKeyFormController extends TransactionFormController {

    //----------------------------------------------------------------//
    constructor ( accountService ) {
        super ();

        const fieldsArray = [
            new Fields.StringFieldController    ( 'keyName' ),
            new Fields.StringFieldController    ( 'key' ),
            new Fields.StringFieldController    ( 'policyName' ),
        ];
        this.initialize ( accountService, TRANSACTION_TYPE.AFFIRM_KEY, fieldsArray );
    }
}
