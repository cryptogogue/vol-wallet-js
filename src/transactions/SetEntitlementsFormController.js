// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                          from '../fields/fields'
import { TransactionFormController }        from './TransactionFormController';
import { randomBytes }                      from 'fgc';
import _                                    from 'lodash';
import { action }                           from 'mobx';
import * as vol                             from 'vol';
import { TRANSACTION_TYPE }                 from 'vol';

//================================================================//
// SetEntitlementsFormController
//================================================================//
export class SetEntitlementsFormController extends TransactionFormController {

    //----------------------------------------------------------------//
    constructor ( accountService ) {
        super ();

        const fieldsArray = [
            new Fields.StringFieldController        ( 'name' ),
            new Fields.JSONFieldController          ( 'entitlements' ),
        ];
        this.initialize ( accountService, TRANSACTION_TYPE.SET_ENTITLEMENTS, fieldsArray );
    }
}
