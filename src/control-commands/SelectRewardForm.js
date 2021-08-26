// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                              from '../fields/fields'
import { observer }                             from 'mobx-react';
import React                                    from 'react';

//================================================================//
// SelectRewardForm
//================================================================//
export const SelectRewardForm = observer (({ controller }) => {

    return (
        <React.Fragment>
        	<Fields.StringField field = { controller.fields.reward }/>
        </React.Fragment>
    );
});
