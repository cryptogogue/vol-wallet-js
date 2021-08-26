// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                              from '../fields/fields'
import { observer }                             from 'mobx-react';
import React                                    from 'react';

//================================================================//
// ExtendNetworkForm
//================================================================//
export const ExtendNetworkForm = observer (({ controller }) => {

    return (
        <React.Fragment>
        	<Fields.StringField field = { controller.fields.url }/>
        </React.Fragment>
    );
});
