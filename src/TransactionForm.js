// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { BasicTransactionForm }                 from './BasicTransactionForm';
import { CraftingForm }                         from './CraftingForm';
import { UpgradesForm }                         from './UpgradesForm';
import { TRANSACTION_TYPE }                     from './Transaction';
import { assert, excel, hooks, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                             from 'mobx-react';
import React, { useState }                      from 'react';
import * as UI                                  from 'semantic-ui-react';

//================================================================//
// TransactionForm
//================================================================//
export const TransactionForm = observer (({ controller }) => {

    switch ( controller.type ) {
        case TRANSACTION_TYPE.ACCOUNT_POLICY:
        case TRANSACTION_TYPE.AFFIRM_KEY:
        case TRANSACTION_TYPE.BETA_GET_ASSETS:
        case TRANSACTION_TYPE.BETA_GET_DECK:
        case TRANSACTION_TYPE.KEY_POLICY:
        case TRANSACTION_TYPE.OPEN_ACCOUNT:
        case TRANSACTION_TYPE.PUBLISH_SCHEMA:
        case TRANSACTION_TYPE.PUBLISH_SCHEMA_AND_RESET:
        case TRANSACTION_TYPE.REGISTER_MINER:
        case TRANSACTION_TYPE.RENAME_ACCOUNT:
        case TRANSACTION_TYPE.RESERVE_ACCOUNT_NAME:
        case TRANSACTION_TYPE.SELECT_REWARD:
        case TRANSACTION_TYPE.SEND_ASSETS:
        case TRANSACTION_TYPE.SEND_VOL:
        case TRANSACTION_TYPE.SET_MINIMUM_GRATUITY:
            return (
                <BasicTransactionForm controller = { controller }/>
            );
        case TRANSACTION_TYPE.RUN_SCRIPT:
            return (
                <CraftingForm controller = { controller }/>
            );
        case TRANSACTION_TYPE.UPGRADE_ASSETS:
            return (
                <UpgradesForm controller = { controller }/>
            );
    }
    return (
        <div/>
    );
});
