// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                              from '../fields/fields'
import { assert, excel, hooks, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import { DateTime }                             from 'luxon';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                             from 'mobx-react';
import React, { useState }                      from 'react';
import { DateInput, TimeInput }                 from 'semantic-ui-calendar-react';
import * as UI                                  from 'semantic-ui-react';

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
