// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                              from '../fields/fields'
import { observer }                             from 'mobx-react';
import React                                    from 'react';
import * as UI                                  from 'semantic-ui-react';

//================================================================//
// SetEntitlementsForm
//================================================================//
export const SetEntitlementsForm = observer (({ controller }) => {

    return (
        <React.Fragment>
            <Fields.StringField     placeholder = 'Name' field = { controller.fields.name }/>
            <Fields.JSONField       placeholder = 'Entitlements' field = { controller.fields.entitlements } rows = { 8 }/>
        </React.Fragment>
    );
});
