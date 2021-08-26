// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                              from '../fields/fields'
import { observer }                             from 'mobx-react';
import React                                    from 'react';

//================================================================//
// SetMinimumGratuityForm
//================================================================//
export const SetMinimumGratuityForm = observer (({ controller }) => {

    return (
        <React.Fragment>
        	<Fields.VOLField field = { controller.fields.minimum }/>
        </React.Fragment>
    );
});
