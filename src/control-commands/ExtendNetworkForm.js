// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                              from '../fields/fields'
import { assert, excel, hooks, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                             from 'mobx-react';
import React, { useState }                      from 'react';
import * as UI                                  from 'semantic-ui-react';

//================================================================//
// ExtendNetworkForm
//================================================================//
export const ExtendNetworkForm = observer (({ controller }) => {

    return (
        <React.Fragment>
        	<Fields.StringField field = { controller.fields.url }/>
        </React.Fragment>
    );
});
