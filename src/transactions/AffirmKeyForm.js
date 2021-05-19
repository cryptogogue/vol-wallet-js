// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                              from '../fields/fields'
import { assert, excel, hooks, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                             from 'mobx-react';
import React, { useState }                      from 'react';
import * as UI                                  from 'semantic-ui-react';

//================================================================//
// AffirmKeyForm
//================================================================//
export const AffirmKeyForm = observer (({ controller }) => {

    return (
        <React.Fragment>
            <Fields.StringField     placeholder = 'Key Name' field = { controller.fields.keyName }/>
            <Fields.StringField     placeholder = 'Key' field = { controller.fields.key }/>
            <Fields.StringField     placeholder = 'Policy' field = { controller.fields.policyName }/>
        </React.Fragment>
    );
});
