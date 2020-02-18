// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { Transaction, TRANSACTION_TYPE }    from './Transaction';
import { TransactionFormController }        from './TransactionFormController';
import { FIELD_CLASS }                      from './TransactionFormFieldControllers';
import { assert, randomBytes, util }        from 'fgc';
import _                                    from 'lodash';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';

//================================================================//
// TransactionFormController_UpgradeAssets
//================================================================//
export class TransactionFormController_UpgradeAssets extends TransactionFormController {

    //----------------------------------------------------------------//
    constructor ( appState, upgradeMap ) {
        super ();

        const fieldsArray = [
            new FIELD_CLASS.CONST       ( 'upgrades', 'Upgrades', upgradeMap ),
        ];
        this.initialize ( appState, TRANSACTION_TYPE.UPGRADE_ASSETS, fieldsArray );
    }
}
