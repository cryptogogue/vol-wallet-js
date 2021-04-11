// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                          from '../fields/fields'
import { Transaction, TRANSACTION_TYPE }    from './Transaction';
import { TransactionFormController }        from './TransactionFormController';
import { assert, randomBytes, util }        from 'fgc';
import _                                    from 'lodash';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';

//================================================================//
// OpenAccountFormController
//================================================================//
export class OpenAccountFormController extends TransactionFormController {

    //----------------------------------------------------------------//
    constructor ( accountService ) {
        super ();

        // TODO: replace with something deterministic        
        const suffixPart = () => {
            return randomBytes ( 2 ).toString ( 'hex' ).substring ( 0, 3 );
        }
        const suffix = `${ suffixPart ()}.${ suffixPart ()}.${ suffixPart()}`.toUpperCase ();
        console.log ( 'SUFFIX:', suffix );

        const fieldsArray = [
            new Fields.StringFieldController        ( 'suffix',         'Suffix', suffix ),
            new Fields.TextFieldController          ( 'request',        'New Account Request', 6 ),
            new Fields.VOLFieldController           ( 'grant',          'Grant', 0 ),
        ];
        this.initialize ( accountService, TRANSACTION_TYPE.OPEN_ACCOUNT, fieldsArray );
    }

    //----------------------------------------------------------------//
    @action
    decodeRequest () {

        console.log ( 'DECODE REQUEST', this.fields.request.value );

        let encoded = this.fields.request.value;
        if ( encoded && encoded.length ) {
            try {

                encoded = encoded.replace ( /(\r\n|\n|\r )/gm, '' );
                console.log ( 'ENCODED:', encoded );

                const requestJSON = Buffer.from ( encoded, 'base64' ).toString ( 'utf8' );
                const request = JSON.parse ( requestJSON );

                if ( !request ) return 'Problem decoding request.';
                if ( !request.key ) return 'Missing key.';
                if ( request.genesis !== this.networkService.genesis ) return 'Genesis block mismatch; this request is for another network.';

                console.log ( 'DECODED REQUEST:', request );

                // TODO: check key format and validity!

                return request;
            }
            catch ( error ) {
                console.log ( error );
            }
        }
        return 'Problem decoding request.';
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
            if ( typeof ( request ) === 'string' ) {
                this.fields.request.error = request;
            }
        }
    }
}
