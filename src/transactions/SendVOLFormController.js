// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                          from '../fields/fields'
import { TRANSACTION_TYPE }                 from './Transaction';
import { TransactionFormController }        from './TransactionFormController';
import _                                    from 'lodash';
import { action }                           from 'mobx';

//================================================================//
// SendVOLFormController
//================================================================//
export class SendVOLFormController extends TransactionFormController {

    //----------------------------------------------------------------//
    constructor ( accountService ) {
        super ();

        const fieldsArray = [
            new Fields.StringFieldController    ( 'accountName' ),
            new Fields.VOLFieldController       ( 'amount' ),
        ];
        this.initialize ( accountService, TRANSACTION_TYPE.SEND_VOL, fieldsArray );
    }

    //----------------------------------------------------------------//
    @action
    virtual_validate () {

        if ( this.makerAccountName === this.fields.accountName.value ) {
            this.fields.accountName.error = 'Maker cannot also be recipient.';
        }

        if ( this.fields.amount.hasValue ) {

            if ( this.fields.amount.value === 0 ) {
                this.fields.amount.error = 'Pick a non-zero amount.';
            }
        }
    }
};
