// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                              from '../fields/fields'
import { observer }                             from 'mobx-react';
import React                                    from 'react';

//================================================================//
// SendVOLForm
//================================================================//
export const SendVOLForm = observer (({ controller }) => {

    return (
        <React.Fragment>
            <Fields.StringField     placeholder = 'Recipient' field = { controller.fields.accountName }/>
            <Fields.VOLField        placeholder = 'Amount' field = { controller.fields.amount }/>
        </React.Fragment>
    );
});
