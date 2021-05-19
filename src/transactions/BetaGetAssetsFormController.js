// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                          from '../fields/fields'
import { Transaction, TRANSACTION_TYPE }    from './Transaction';
import { TransactionFormController }        from './TransactionFormController';
import { assert, randomBytes, util }        from 'fgc';
import _                                    from 'lodash';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';

//================================================================//
// BetaGetAssetsFormController
//================================================================//
export class BetaGetAssetsFormController extends TransactionFormController {

    //----------------------------------------------------------------//
    constructor ( accountService ) {
        super ();

        const fieldsArray = [
            new Fields.IntegerFieldController	( 'numAssets', 1 ),
        ];
        this.initialize ( accountService, TRANSACTION_TYPE.BETA_GET_ASSETS, fieldsArray );
    }
}
