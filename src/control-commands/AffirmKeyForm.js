// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                              from '../fields/fields'
import { BasicTransactionForm }                 from './BasicTransactionForm';
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
        <BasicTransactionForm controller = { controller }/>
    );
});