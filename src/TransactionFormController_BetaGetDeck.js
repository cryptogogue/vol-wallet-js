// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { Transaction, TRANSACTION_TYPE }    from './Transaction';
import { TransactionFormController }        from './TransactionFormController';
import { FIELD_CLASS }                      from './TransactionFormFieldControllers';
import { assert, randomBytes, util }        from 'fgc';
import _                                    from 'lodash';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';

//================================================================//
// TransactionFormController_BetaGetDeck
//================================================================//
export class TransactionFormController_BetaGetDeck extends TransactionFormController {

    //----------------------------------------------------------------//
    constructor ( appState ) {
        super ();

        const fieldsArray = [
            new FIELD_CLASS.STRING  ( 'deckName', 'Deck Name' ),
        ];
        this.initialize ( appState, TRANSACTION_TYPE.BETA_GET_DECK, fieldsArray );
    }
}
