// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                          from '../fields/fields'
import { TransactionFormController }        from './TransactionFormController';
import _                                    from 'lodash';
import { action, computed, observable }     from 'mobx';
import { TRANSACTION_TYPE }                 from 'vol';

//================================================================//
// SetTermsOfServiceFormController
//================================================================//
export class SetTermsOfServiceFormController extends TransactionFormController {

    //----------------------------------------------------------------//
    constructor ( appState ) {
        super ();

        const fieldsArray = [
            new Fields.StringFieldController    ( 'text' ),
        ];
        this.initialize ( appState, TRANSACTION_TYPE.SET_TERMS_OF_SERVICE, fieldsArray );
    }

    //----------------------------------------------------------------//
    setText ( text ) {

        this.fields.text.setInputString ( text );
    }

    //----------------------------------------------------------------//
    @computed get
    text () {

        return this.fields.text && this.fields.text.value || '';
    }
};
