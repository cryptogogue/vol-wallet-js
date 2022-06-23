// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                          from '../fields/fields'
import { TransactionFormController }        from './TransactionFormController';
import _                                    from 'lodash';
import { TRANSACTION_TYPE }                 from 'vol';

//================================================================//
// BetaGetDeckFormController
//================================================================//
export class BetaGetDeckFormController extends TransactionFormController {

    //----------------------------------------------------------------//
    constructor ( accountService ) {
        super ();

        const fieldsArray = [
            new Fields.StringFieldController	( 'deckName' ),
        ];
        this.initialize ( accountService, TRANSACTION_TYPE.BETA_GET_DECK, fieldsArray );
    }
}
