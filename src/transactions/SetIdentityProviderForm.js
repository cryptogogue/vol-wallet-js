// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                              from '../fields/fields'
import { observer }                             from 'mobx-react';
import React                                    from 'react';

//================================================================//
// SetIdentityProviderForm
//================================================================//
export const SetIdentityProviderForm = observer (({ controller }) => {

    return (
        <React.Fragment>
            <Fields.StringField     placeholder = 'Key Name'                    field = { controller.fields.keyName }/>
            <Fields.StringField     placeholder = 'Ed25519 Public Hex'          field = { controller.fields.ed25519PublicHex }/>
            <Fields.VOLField        placeholder = 'Grant'                       field = { controller.fields.grant }/>
            <Fields.StringField     placeholder = 'Key Base Entitlements'       field = { controller.fields.keyBaseEntitlements }/>
            <Fields.StringField     placeholder = 'Account Base Entitlements'   field = { controller.fields.accountBaseEntitlements }/>
        </React.Fragment>
    );
});
