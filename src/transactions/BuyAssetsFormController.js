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
// BuyAssetsFormController
//================================================================//
export class BuyAssetsFormController extends TransactionFormController {

    //----------------------------------------------------------------//
    constructor ( accountService, price, offerID, selection ) {
        super ();

        this.minimumPrice = price;
        this.offerID = offerID;

        const fieldsArray = [
            new Fields.AssetSelectionFieldController    ( 'selection', _.cloneDeep ( selection )),
            new Fields.VOLFieldController               ( 'price', 0, price ),
        ];
        this.initialize ( accountService, TRANSACTION_TYPE.BUY_ASSETS, fieldsArray );
    }

    //----------------------------------------------------------------//
    virtual_decorateTransaction ( transaction ) {
    }

    //----------------------------------------------------------------//
    virtual_checkComplete () {

        return this.fields.selection.assetIDs.length > 0;
    }

    //----------------------------------------------------------------//
    virtual_composeBody () {

        return {
            offerID:        this.offerID,
            price:          this.fields.price.value,
        };
    }

    //----------------------------------------------------------------//
    @action
    virtual_validate () {

        if ( this.fields.price.value < this.minimumPrice ) {
            this.fields.price.error = `Offer price must meet or exceed ${ vol.format ( this.minimumPrice )}.`;
        }
    }
}
