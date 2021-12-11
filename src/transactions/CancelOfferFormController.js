// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                          from '../fields/fields'
import { TRANSACTION_TYPE }                 from './Transaction';
import { TransactionFormController }        from './TransactionFormController';
import _                                    from 'lodash';

//================================================================//
// CancelOfferFormController
//================================================================//
export class CancelOfferFormController extends TransactionFormController {

    //----------------------------------------------------------------//
    constructor ( accountService, selection, offerID ) {
        super ();

        this.offerID = offerID;

        const fieldsArray = [
            new Fields.AssetSelectionFieldController    ( 'selection', _.cloneDeep ( selection )),
        ];
        this.initialize ( accountService, TRANSACTION_TYPE.CANCEL_OFFER, fieldsArray );
    }

    //----------------------------------------------------------------//
    virtual_decorateTransaction ( transaction ) {
        
        if ( this.offerID ) {
            transaction.setOfferID ( this.offerID );
        }
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
