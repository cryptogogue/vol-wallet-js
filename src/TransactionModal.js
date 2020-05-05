// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { CraftingForm }                         from './CraftingForm';
import { PasswordInputField }                   from './PasswordInputField';
import { Transaction, TRANSACTION_TYPE }        from './Transaction';
import { TransactionForm }                      from './TransactionForm';
import * as controllers                         from './TransactionFormController';
import { TransactionDropdown }                  from './TransactionDropdown';
import { assert, excel, hooks, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                             from 'mobx-react';
import React, { useState }                      from 'react';
import * as UI                                  from 'semantic-ui-react';

//================================================================//
// TransactionFormFactory
//================================================================//
const TransactionFormFactory = observer (({ controller }) => {

    switch ( controller.type ) {
        case TRANSACTION_TYPE.ACCOUNT_POLICY:
        case TRANSACTION_TYPE.AFFIRM_KEY:
        case TRANSACTION_TYPE.BETA_GET_ASSETS:
        case TRANSACTION_TYPE.BETA_GET_DECK:
        case TRANSACTION_TYPE.KEY_POLICY:
        case TRANSACTION_TYPE.OPEN_ACCOUNT:
        case TRANSACTION_TYPE.PUBLISH_SCHEMA:
        case TRANSACTION_TYPE.REGISTER_MINER:
        case TRANSACTION_TYPE.RENAME_ACCOUNT:
        case TRANSACTION_TYPE.SEND_ASSETS:
        case TRANSACTION_TYPE.SEND_VOL:
        case TRANSACTION_TYPE.UPGRADE_ASSETS:
            return (
                <TransactionForm controller = { controller }/>
            );
        case TRANSACTION_TYPE.RUN_SCRIPT:
            return (
                <CraftingForm controller = { controller }/>
            );
    }
    return (
        <div/>
    );
});

//================================================================//
// TransactionModalBody
//================================================================//
const TransactionModalBody = observer (( props ) => {

    const { appState, open, onClose }                               = props;
    const [ password, setPassword ]                                 = useState ( '' );
    const [ controllerFromDropdown, setControllerFromDropdown ]     = useState ( false );

    const controller = props.controller || controllerFromDropdown;

    const showDropdown      = !props.controller;
    const title             = showDropdown ? 'New Transaction' : controller.friendlyName;
    const stageEnabled      = appState.hasAccountInfo && controller && controller.isCompleteAndErrorFree;
    const submitEnabled     = stageEnabled && appState.checkPassword ( password );
    const submitLabel       = appState.stagedTransactions.length > 0 ? 'Submit Transactions' : 'Submit Transaction';

    const submit = () => {
        appState.pushTransaction ( controller.transaction );
        if ( submitEnabled ) {
            appState.submitTransactions ( password );
        }
        onClose ();
    }

    return (
        <UI.Modal
            key = { controller ? controller.type : -1 }
            size = 'small'
            closeIcon
            onClose = {() => { onClose ()}}
            open = { open }
        >
            <UI.Modal.Header>{ title }</UI.Modal.Header>
            
            <UI.Modal.Content>

                <If condition = { showDropdown }>
                    <TransactionDropdown
                        appState                = { appState }
                        controller              = { controller }
                        setController           = { setControllerFromDropdown }
                    />
                </If>
                
                <If condition = { controller }>
                    <TransactionFormFactory controller = { controller }/>
                </If>

                <UI.Form>
                    <PasswordInputField
                        appState = { appState }
                        setPassword = { setPassword }
                    />
                </UI.Form>
            </UI.Modal.Content>

            <UI.Modal.Actions>
                <UI.Button
                    positive
                    disabled = { submitEnabled || !stageEnabled }
                    onClick = {() => { submit ()}}
                >
                    Stage Transaction
                </UI.Button>
                <UI.Button
                    positive
                    disabled = { !submitEnabled }
                    onClick = {() => { submit ()}}
                >
                    { submitLabel }
                </UI.Button>
            </UI.Modal.Actions>
        </UI.Modal>
    );
});

//================================================================//
// TransactionModal
//================================================================//
export const TransactionModal = observer (( props ) => {

    const { appState } = props;
    const [ counter, setCounter ] = useState ( 0 );

    const onClose = () => {
        setCounter ( counter + 1 );
        props.onClose ();
    }

    return (
        <div key = { `${ counter }` }>
            <TransactionModalBody
                appState                = { appState }
                open                    = { props.open }
                onClose                 = { onClose }
                controller              = { props.controller || false }
            />
        </div>
    );
});
