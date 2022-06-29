// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                          from '../fields/fields'
import { TransactionFormController }        from './TransactionFormController';
import _                                    from 'lodash';
import { action, computed, observable }     from 'mobx';
import { TRANSACTION_TYPE }                 from 'vol';

//================================================================//
// IdentifyAccountFormController
//================================================================//
export class IdentifyAccountFormController extends TransactionFormController {

    //----------------------------------------------------------------//
    constructor ( accountService ) {
        super ();

        const fieldsArray = [
            new Fields.StringFieldController    ( 'gamercert' ),
            new Fields.VOLFieldController       ( 'grant', 0 ),
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
            provider:   'gamercert',
            grant:      this.fields.grant.value,
            identity:   JSON.parse ( this.fields.gamercert.value ),
        };
    }
}
