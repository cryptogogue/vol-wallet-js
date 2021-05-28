// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                          from '../fields/fields'
import { Transaction, TRANSACTION_TYPE }    from './Transaction';
import { TransactionFormController }        from './TransactionFormController';
import * as vol                             from '../util/vol';
import { assert, randomBytes, util }        from 'fgc';
import _                                    from 'lodash';
import { DateTime, Duration }               from 'luxon';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';

//================================================================//
// CancelOfferFormController
//================================================================//
export class CancelOfferFormController extends TransactionFormController {

    //----------------------------------------------------------------//
    constructor ( accountService, selection ) {
        super ();

        const fieldsArray = [
            new Fields.AssetSelectionFieldController    ( 'selection', _.cloneDeep ( selection )),
        ];
        this.initialize ( accountService, TRANSACTION_TYPE.CANCEL_OFFER, fieldsArray );
    }

    //----------------------------------------------------------------//
    virtual_checkComplete () {

        return this.fields.selection.assetIDs.length > 0;
    }

    //----------------------------------------------------------------//
    virtual_composeBody () {

        return {
            identifier:     this.fields.selection.assetIDs [ 0 ],
        };
    }
}
