// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { Transaction, TRANSACTION_TYPE }    from './Transaction';
import { TransactionFormController }        from './TransactionFormController';
import { FIELD_CLASS }                      from './TransactionFormFieldControllers';
import { assert, randomBytes, util }        from 'fgc';
import _                                    from 'lodash';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';

//================================================================//
// TransactionFormController_OpenAccount
//================================================================//
export class TransactionFormController_OpenAccount extends TransactionFormController {

    //----------------------------------------------------------------//
    constructor ( appState ) {
        super ();

        // TODO: replace with something deterministic        
        const suffixPart = () => {
            return randomBytes ( 2 ).toString ( 'hex' ).substring ( 0, 3 );
        }
        const suffix = `${ suffixPart ()}.${ suffixPart ()}.${ suffixPart()}`.toUpperCase ();
        console.log ( 'SUFFIX:', suffix );

        const fieldsArray = [
            new FIELD_CLASS.CONST           ( 'suffix',         'Suffix', suffix ),
            new FIELD_CLASS.CRYPTO_KEY      ( 'request',        'New Account Request', 6 ),
            new FIELD_CLASS.INTEGER         ( 'grant',          'Grant', 0 ),
        ];
        this.initialize ( appState, TRANSACTION_TYPE.OPEN_ACCOUNT, fieldsArray );
    }

    //----------------------------------------------------------------//
    decodeRequest () {

        console.log ( 'DECODE REQUEST', this.fields.request.value );

        let encoded = this.fields.request.value;
        if ( encoded && encoded.length ) {
            try {

                encoded = encoded.replace ( /(\r\n|\n|\r )/gm, '' );
                console.log ( 'ENCODED:', encoded );

                const requestJSON = Buffer.from ( encoded, 'base64' ).toString ( 'utf8' );
                const request = JSON.parse ( requestJSON );

                if ( !request ) return false;
                if ( !request.key ) return false;
                if ( request.networkID !== this.appState.network.identity ) return false;

                console.log ( 'DECODED REQUEST:', request );

                // TODO: check key format and validity!

                return request;
            }
            catch ( error ) {
                console.log ( error );
            }
        }
        return false;
    }

    //----------------------------------------------------------------//
    virtual_composeBody ( fieldValues ) {

        const request = this.decodeRequest ();

        let body = {
            suffix:     this.fields.suffix.value,
            key:        request && request.key || false,
            grant:      this.fields.grant.value,
        };
        return body;
    }

    //----------------------------------------------------------------//
    @action
    virtual_validate () {

        const encoded = this.fields.request.value || '';

        if ( encoded.length > 0 ) {
            const request = this.decodeRequest ();
            if ( !request ) {
                this.fields.request.error = 'Problem decoding request.';
            }
        }
    }
}
