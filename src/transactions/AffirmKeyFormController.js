// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                          from '../fields/fields'
import { Transaction, TRANSACTION_TYPE }    from './Transaction';
import { TransactionFormController }        from './TransactionFormController';
import { assert, randomBytes, util }        from 'fgc';
import _                                    from 'lodash';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';

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
