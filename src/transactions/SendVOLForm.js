// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                              from './fields/transaction-fields'
import { BasicTransactionForm }                 from './BasicTransactionForm';
import { assert, excel, hooks, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                             from 'mobx-react';
import React, { useState }                      from 'react';
import * as UI                                  from 'semantic-ui-react';

//================================================================//
// SendVOLForm
//================================================================//
export const SendVOLForm = observer (({ controller }) => {

    return (
        <BasicTransactionForm controller = { controller }/>
    );
});
