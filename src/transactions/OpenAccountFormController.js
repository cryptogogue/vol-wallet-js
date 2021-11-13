// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                          from '../fields/fields'
import { TRANSACTION_TYPE }                 from './Transaction';
import { TransactionFormController }        from './TransactionFormController';
import { randomBytes }                      from 'fgc';
import _                                    from 'lodash';
import { action }                           from 'mobx';
import { vol }                              from 'vol';

//const debugLog = function () {}
const debugLog = function ( ...args ) { console.log ( 'OPEN ACCOUNT CONTROLLER:', ...args ); }

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
        const suffix = `${ suffixPart ()}.${ suffixPart ()}.${ suffixPart ()}`.toUpperCase ();
        console.log ( 'SUFFIX:', suffix );

        const fieldsArray = [
            new Fields.StringFieldController        ( 'suffix', suffix ),
            new Fields.StringFieldController        ( 'request' ),
            new Fields.VOLFieldController           ( 'grant', 0 ),
        ];
        this.initialize ( accountService, TRANSACTION_TYPE.OPEN_ACCOUNT, fieldsArray );
    }

    //----------------------------------------------------------------//
    @action
    decodeRequest () {

        debugLog ( 'DECODE REQUEST', this.fields.request.value );

        const request = vol.util.decodeAccountRequest ( this.fields.request.value );

        if ( !request ) return 'Problem decoding request.';
        if ( !request.key ) return 'Missing key.';
        if ( request.genesis !== this.networkService.genesis ) return 'Genesis block mismatch; this request is for another network.';

        return request;
    }

    //----------------------------------------------------------------//
    virtual_composeBody () {

        const request = this.decodeRequest ();

        debugLog ( 'COMPOSING BODY WITH REQUEST:', request );

        let body = {
            suffix:     this.fields.suffix.value,
            key:        request && request.key || false,
            grant:      this.fields.grant.value,
        };


        if ( request.signature ) {
            body.signature = request.signature;
        }

        return body;
    }

    //----------------------------------------------------------------//
    @action
    virtual_validate () {

        const encoded = this.fields.request.value || '';

        if ( encoded.length > 0 ) {
            const request = this.decodeRequest ();

            debugLog ( 'VALIDATING REQUEST:', request );

            if ( request === false ) {
                this.fields.request.error = request;
            }
        }
    }
}
