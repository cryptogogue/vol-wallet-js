// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                              from '../fields/fields'
import { observer }                             from 'mobx-react';
import React                                    from 'react';

//================================================================//
// AccountPolicyForm
//================================================================//
export const AccountPolicyForm = observer (({ controller }) => {

    return (
        <React.Fragment>
            <Fields.StringField     placeholder = 'Policy Name' field = { controller.fields.policyName }/>
            <Fields.TextField       placeholder = 'Policy' field = { controller.fields.policy }/>
        </React.Fragment>
    );
});
