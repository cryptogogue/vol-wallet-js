// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                          from '../fields/fields'
import { TransactionFormController }        from './TransactionFormController';
import _                                    from 'lodash';
import { action }                           from 'mobx';
import * as vol                             from 'vol';
import { TRANSACTION_TYPE }                 from 'vol';

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
        
        transaction.setOfferID ( this.offerID );
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
            this.fields.price.error = `Offer price must meet or exceed ${ vol.util.format ( this.minimumPrice )}.`;
        }
    }
}
