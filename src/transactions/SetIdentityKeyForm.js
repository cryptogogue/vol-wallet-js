// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                              from '../fields/fields'
import { observer }                             from 'mobx-react';
import React                                    from 'react';

//================================================================//
// SetIdentityKeyForm
//================================================================//
export const SetIdentityKeyForm = observer (({ controller }) => {

    return (
        <React.Fragment>
            <Fields.StringField     placeholder = 'Key Name' field = { controller.fields.keyName }/>
            <Fields.StringField     placeholder = 'Ed25519 Public Hex' field = { controller.fields.ed25519PublicHex }/>
        </React.Fragment>
    );
});
