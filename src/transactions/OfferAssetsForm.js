// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                              from '../fields/fields'
import { assert, excel, hooks, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                             from 'mobx-react';
import React, { useState }                      from 'react';
import * as UI                                  from 'semantic-ui-react';

//================================================================//
// OfferAssetsForm
//================================================================//
export const OfferAssetsForm = observer (({ controller }) => {

    return (
        <React.Fragment>
            <Fields.AssetSelectionField field   = { controller.fields.assetIdentifiers }/>
            <Fields.VOLField field              = { controller.fields.minimumPrice }/>
        </React.Fragment>
    );
});
