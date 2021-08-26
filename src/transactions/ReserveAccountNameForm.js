// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                              from '../fields/fields'
import { observer }                             from 'mobx-react';
import React                                    from 'react';

//================================================================//
// ReserveAccountNameForm
//================================================================//
export const ReserveAccountNameForm = observer (({ controller }) => {

    return (
        <React.Fragment>
            <Fields.StringField     placeholder = 'Reserve Name' field = { controller.fields.secretName }/>
        </React.Fragment>
    );
});
