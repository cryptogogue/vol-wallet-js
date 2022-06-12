// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                          from '../fields/fields'
import { TRANSACTION_TYPE }                 from './Transaction';
import { TransactionFormController }        from './TransactionFormController';
import _                                    from 'lodash';

//================================================================//
// SetIdentityKeyFormController
//================================================================//
export class SetIdentityKeyFormController extends TransactionFormController {

    //----------------------------------------------------------------//
    constructor ( accountService ) {
        super ();

        const fieldsArray = [
            new Fields.StringFieldController    ( 'keyName' ),
            new Fields.StringFieldController    ( 'ed25519PublicHex' ),
        ];
        this.initialize ( accountService, TRANSACTION_TYPE.SET_IDENTITY_KEY, fieldsArray );
    }
}
