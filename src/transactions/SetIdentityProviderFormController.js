// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                          from '../fields/fields'
import { TransactionFormController }        from './TransactionFormController';
import _                                    from 'lodash';
import { TRANSACTION_TYPE }                 from 'vol';

//================================================================//
// SetIdentityProviderFormController
//================================================================//
export class SetIdentityProviderFormController extends TransactionFormController {

    //----------------------------------------------------------------//
    constructor ( accountService ) {
        super ();

        const fieldsArray = [
            new Fields.StringFieldController    ( 'keyName' ),
            new Fields.StringFieldController    ( 'ed25519PublicHex' ),
            new Fields.VOLFieldController       ( 'grant', 0 ),
            new Fields.StringFieldController    ( 'keyBaseEntitlements', '' ),
            new Fields.StringFieldController    ( 'accountBaseEntitlements', '' ),
        ];
        this.initialize ( accountService, TRANSACTION_TYPE.SET_IDENTITY_PROVIDER, fieldsArray );
    }

    //----------------------------------------------------------------//
    virtual_composeBody () {

        return {
            name:                   'gamercert',
            identityProvider: {
                providerKeyName:    this.fields.keyName.transactionFieldValue,
                ed25519PublicHex:   this.fields.ed25519PublicHex.transactionFieldValue,
                grant:              this.fields.grant.transactionFieldValue,
                keyPolicy: {
                    base:           this.fields.keyBaseEntitlements.transactionFieldValue,
                },
                accountPolicy: {
                    base:           this.fields.accountBaseEntitlements.transactionFieldValue,
                }
            }
        };
    }
}
