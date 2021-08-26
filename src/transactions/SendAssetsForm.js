// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                              from '../fields/fields'
import { observer }                             from 'mobx-react';
import React                                    from 'react';

//================================================================//
// SendAssetsForm
//================================================================//
export const SendAssetsForm = observer (({ controller }) => {

    return (
        <React.Fragment>
            <Fields.StringField             placeholder = 'Recipient' field = { controller.fields.accountName }/>
            <Fields.AssetSelectionField     placeholder = 'Assets' field = { controller.fields.assetIdentifiers }/>
        </React.Fragment>
    );
});
