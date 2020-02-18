// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { Transaction, TRANSACTION_TYPE }    from './Transaction';
import { TransactionFormController }        from './TransactionFormController';
import { FIELD_CLASS }                      from './TransactionFormFieldControllers';
import { assert, randomBytes, util }        from 'fgc';
import _                                    from 'lodash';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';

//================================================================//
// TransactionFormController_SendAssets
//================================================================//
export class TransactionFormController_SendAssets extends TransactionFormController {

    //----------------------------------------------------------------//
    constructor ( appState, selection ) {
        super ();

        const fieldsArray = [
            new FIELD_CLASS.STRING              ( 'accountName',        'Recipient' ),
            new FIELD_CLASS.ASSET_SELECTION     ( 'assetIdentifiers',   'Assets', _.cloneDeep ( selection )),
        ];
        this.initialize ( appState, TRANSACTION_TYPE.SEND_ASSETS, fieldsArray );
    }

    //----------------------------------------------------------------//
    virtual_decorateTransaction ( transaction ) {

        transaction.setAssetsUtilized ( this.fields.assetIdentifiers.value );
    }
}
