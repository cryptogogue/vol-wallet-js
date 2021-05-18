// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                              from '../fields/fields'
import { DateTimeInputField }                   from '../DateTimeInputField'
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

    const [ today ]                 = useState ( DateTime.now ());
    const [ date, setDate ]         = useState ( today );

    return (
        <React.Fragment>
            <Fields.AssetSelectionField field   = { controller.fields.assetIdentifiers }/>
            <Fields.VOLField field              = { controller.fields.minimumPrice }/>
            <DateTimeInputField
                date        = { date }
                setDate     = { setDate }
                minDate     = { today }
            />
        </React.Fragment>
    );
});
