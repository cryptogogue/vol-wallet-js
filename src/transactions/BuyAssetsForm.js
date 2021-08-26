// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                              from '../fields/fields'
import { observer }                             from 'mobx-react';
import React                                    from 'react';

//================================================================//
// BuyAssetsForm
//================================================================//
export const BuyAssetsForm = observer (({ controller }) => {

    return (
        <React.Fragment>
            <Fields.AssetSelectionField field = { controller.fields.selection }/>
            <Fields.VOLField placeholder = 'Offer Price' field = { controller.fields.price }/>
        </React.Fragment>
    );
});
