// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                          from '../fields/fields'
import { TRANSACTION_TYPE }                 from './Transaction';
import { TransactionFormController }        from './TransactionFormController';
import { INVENTORY_FILTER_STATUS }          from 'cardmotron';
import _                                    from 'lodash';
import { action }                           from 'mobx';

//================================================================//
// SendAssetsFormController
//================================================================//
export class SendAssetsFormController extends TransactionFormController {

    //----------------------------------------------------------------//
    constructor ( accountService, selection ) {
        super ();

        const fieldsArray = [
            new Fields.StringFieldController            ( 'accountName' ),
            new Fields.AssetSelectionFieldController    ( 'assetIdentifiers', _.cloneDeep ( selection )),
        ];
        this.initialize ( accountService, TRANSACTION_TYPE.SEND_ASSETS, fieldsArray );
    }

    //----------------------------------------------------------------//
    virtual_decorateTransaction ( transaction ) {

        transaction.setAssetsFiltered ( this.fields.assetIdentifiers.assetIDs, INVENTORY_FILTER_STATUS.HIDDEN );
    }

    //----------------------------------------------------------------//
    @action
    virtual_validate () {

        if ( this.makerAccountName === this.fields.accountName.value ) {
            this.fields.accountName.error = 'Maker cannot also be recipient.';
        }
    }
}
