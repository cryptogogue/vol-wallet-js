// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                              from '../fields/fields'
import { observer }                             from 'mobx-react';
import React                                    from 'react';
import * as UI                                  from 'semantic-ui-react';

//================================================================//
// OpenAccountForm
//================================================================//
export const OpenAccountForm = observer (({ controller }) => {

    const accountName = `.${ controller.accountService.accountID }.${ controller.fields.suffix.value }`;

    return (
        <React.Fragment>
            <UI.Header as = 'h3'>{ accountName }</UI.Header>
            <Fields.TextField       placeholder = 'New Account Request' field = { controller.fields.request } rows = { 6 }/>
            <Fields.VOLField        placeholder = 'Grant' field = { controller.fields.grant }/>
        </React.Fragment>
    );
});
