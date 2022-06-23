// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                          from '../fields/fields'
import { TransactionFormController }        from './TransactionFormController';
import _                                    from 'lodash';
import { TRANSACTION_TYPE }                 from 'vol';

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
