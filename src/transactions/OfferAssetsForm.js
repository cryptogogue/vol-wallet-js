// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                              from '../fields/fields'
import { observer }                             from 'mobx-react';
import React                                    from 'react';

//================================================================//
// OfferAssetsForm
//================================================================//
export const OfferAssetsForm = observer (({ controller }) => {

    return (
        <React.Fragment>
            <Fields.AssetSelectionField field = { controller.fields.assetIdentifiers }/>
            <Fields.VOLField placeholder = 'Minimum Price' field = { controller.fields.minimumPrice }/>
            <Fields.DateTimeField field = { controller.fields.expiration }/>
        </React.Fragment>
    );
});
