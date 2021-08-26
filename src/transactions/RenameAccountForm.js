// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                              from '../fields/fields'
import { observer }                             from 'mobx-react';
import React                                    from 'react';

//================================================================//
// RenameAccountForm
//================================================================//
export const RenameAccountForm = observer (({ controller }) => {

    return (
        <React.Fragment>
            <Fields.StringField     placeholder = 'New Name' field = { controller.fields.revealedName }/>
        </React.Fragment>
    );
});
