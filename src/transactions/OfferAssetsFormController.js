// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                          from '../fields/fields'
import { TransactionFormController }        from './TransactionFormController';
import { INVENTORY_FILTER_STATUS }          from 'cardmotron';
import _                                    from 'lodash';
import { DateTime }                         from 'luxon';
import { action }                           from 'mobx';
import { TRANSACTION_TYPE }                 from 'vol';

//================================================================//
// OfferAssetsFormController
//================================================================//
export class OfferAssetsFormController extends TransactionFormController {

    //----------------------------------------------------------------//
    constructor ( accountService, selection ) {
        super ();

        const now               = DateTime.now ();
        const expiration        = now.startOf ( 'day' ).plus ({ day: 7, hour: 23, minute: 59 });

        const fieldsArray = [
            new Fields.AssetSelectionFieldController    ( 'assetIdentifiers', _.cloneDeep ( selection )),
            new Fields.VOLFieldController               ( 'minimumPrice', 0 ),
            new Fields.DateTimeFieldController          ( 'expiration', expiration, now ),
        ];
        this.initialize ( accountService, TRANSACTION_TYPE.OFFER_ASSETS, fieldsArray );
    }

    //----------------------------------------------------------------//
    virtual_decorateTransaction ( transaction ) {

        transaction.setAssetsFiltered ( this.fields.assetIdentifiers.assetIDs, INVENTORY_FILTER_STATUS.DISABLED );
    }

    //----------------------------------------------------------------//
    @action
    virtual_validate () {
    }
}
