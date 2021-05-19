// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                          from '../fields/fields'
import { Transaction, TRANSACTION_TYPE }    from './Transaction';
import { TransactionFormController }        from './TransactionFormController';
import { assert, randomBytes, util }        from 'fgc';
import _                                    from 'lodash';
import { DateTime, Duration }               from 'luxon';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';

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

        transaction.setAssetsUtilized ( this.fields.assetIdentifiers.selection );
    }

    //----------------------------------------------------------------//
    @action
    virtual_validate () {
    }
}
