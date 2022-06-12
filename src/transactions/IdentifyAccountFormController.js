// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                          from '../fields/fields'
import { TRANSACTION_TYPE }                 from './Transaction';
import { TransactionFormController }        from './TransactionFormController';
import _                                    from 'lodash';
import { action, computed, observable }     from 'mobx';

//================================================================//
// IdentifyAccountFormController
//================================================================//
export class IdentifyAccountFormController extends TransactionFormController {

    //----------------------------------------------------------------//
    constructor ( accountService ) {
        super ();

        const fieldsArray = [
            new Fields.StringFieldController    ( 'gamercert' ),
        ];
        this.initialize ( accountService, TRANSACTION_TYPE.IDENTIFY_ACCOUNT, fieldsArray );
    }

    //----------------------------------------------------------------//
    @computed get
    gamercert () {

        return this.fields.gamercert && this.fields.gamercert.value || '';
    }

    //----------------------------------------------------------------//
    setGamercert ( text ) {

        this.fields.gamercert.setInputString ( text );
    }

    //----------------------------------------------------------------//
    virtual_composeBody () {

        // TODO: make a JSON field type; this is silly
        return {
            gamercert:  JSON.parse ( this.fields.gamercert.value ),
        };
    }
}
