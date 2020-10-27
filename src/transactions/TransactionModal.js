// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { PasswordInputField }                   from '../PasswordInputField';
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
// TransactionModalBody
//================================================================//
const TransactionModalBody = observer (( props ) => {

    const { appState, open, onClose }                               = props;
    const [ password, setPassword ]                                 = useState ( '' );
    const [ controllerFromDropdown, setControllerFromDropdown ]     = useState ( false );
    
    const controller        = props.controller || controllerFromDropdown;
    const queue             = appState.transactionQueue;

    const showDropdown      = !props.controller;
    const title             = controller ? controller.friendlyName : 'New Transaction';
    const stageEnabled      = appState.hasAccountInfo && controller && controller.isCompleteAndErrorFree;
    const submitEnabled     = stageEnabled && appState.checkPassword ( password );
    const submitLabel       = queue.stagedTransactions.length > 0 ? 'Submit Transactions' : 'Submit Transaction';

    const submit = () => {
        queue.pushTransaction ( controller.transaction );
        if ( submitEnabled ) {
            queue.submitTransactions ( password );
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
                    <TransactionForm controller = { controller }/>
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
