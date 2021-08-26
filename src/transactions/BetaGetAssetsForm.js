// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                              from '../fields/fields'
import { observer }                             from 'mobx-react';
import React                                    from 'react';

//================================================================//
// BetaGetAssetsForm
//================================================================//
export const BetaGetAssetsForm = observer (({ controller }) => {

    return (
        <React.Fragment>
            <Fields.IntegerField    placeholder = 'Copies' field = { controller.fields.numAssets }/>
        </React.Fragment>
    );
});
