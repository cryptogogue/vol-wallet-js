// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { Transaction, TRANSACTION_TYPE }    from './Transaction';
import { TransactionFormController }        from './TransactionFormController';
import { FIELD_CLASS }                      from './TransactionFormFieldControllers';
import { assert, randomBytes, util }        from 'fgc';
import _                                    from 'lodash';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';

//================================================================//
// TransactionFormController_SendVOL
//================================================================//
export class TransactionFormController_SendVOL extends TransactionFormController {

    //----------------------------------------------------------------//
    constructor ( appState ) {
        super ();

        const fieldsArray = [
            new FIELD_CLASS.STRING      ( 'accountName',    'Recipient' ),
            new FIELD_CLASS.INTEGER     ( 'amount',         'Amount' ),
        ];
        this.initialize ( appState, TRANSACTION_TYPE.SEND_VOL, fieldsArray );
    }

    //----------------------------------------------------------------//
    @action
    virtual_validate () {

        if ( this.makerAccountName === this.fields.accountName.value ) {
            this.fields.accountName.error = 'Maker cannot also be recipient.';
        }

        if ( this.fields.amount.value === 0 ) {
            this.fields.amount.error = 'Pick a non-zero amount.';
        }
    }
};
