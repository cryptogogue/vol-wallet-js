// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                          from '../fields/fields'
import { Transaction, TRANSACTION_TYPE }    from './Transaction';
import { TransactionFormController }        from './TransactionFormController';
import { assert, randomBytes, util }        from 'fgc';
import _                                    from 'lodash';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';

//================================================================//
// SendAssetsFormController
//================================================================//
export class SendAssetsFormController extends TransactionFormController {

    //----------------------------------------------------------------//
    constructor ( accountService, selection ) {
        super ();

        const fieldsArray = [
            new Fields.StringFieldController            ( 'accountName',        'Recipient' ),
            new Fields.AssetSelectionFieldController    ( 'assetIdentifiers',   'Assets', _.cloneDeep ( selection )),
        ];
        this.initialize ( accountService, TRANSACTION_TYPE.SEND_ASSETS, fieldsArray );
    }

    //----------------------------------------------------------------//
    virtual_decorateTransaction ( transaction ) {

        transaction.setAssetsUtilized ( this.fields.assetIdentifiers.value );
    }

    //----------------------------------------------------------------//
    @action
    virtual_validate () {

        if ( this.makerAccountName === this.fields.accountName.value ) {
            this.fields.accountName.error = 'Maker cannot also be recipient.';
        }
    }
}
