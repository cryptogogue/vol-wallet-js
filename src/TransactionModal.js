// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

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
    const [ controllerFromDropdown, setControllerFromDropdown ]     = useState ( false );

    const controller = props.controller || controllerFromDropdown;

    const submitTransaction = () => {
        appState.pushTransaction ( controller.transaction );
        onClose ();
    }

    const showDropdown      = !props.controller;
    const title             = showDropdown ? 'New Transaction' : controller.friendlyName;
    const submitEnabled     = appState.hasAccountInfo && controller && controller.isCompleteAndErrorFree;

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
            </UI.Modal.Content>

            <UI.Modal.Actions>
                <UI.Button
                    positive
                    disabled = { !submitEnabled }
                    onClick = {() => { submitTransaction ()}}
                >
                    Submit Transaction
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

    const open = Boolean ( props.open || props.controller );

    const onClose = () => {
        setCounter ( counter + 1 );
        props.onClose ();
    }

    return (
        <div key = { `${ counter }` }>
            <TransactionModalBody
                appState                = { appState }
                open                    = { open }
                onClose                 = { onClose }
                controller              = { props.controller || false }
            />
        </div>
    );
});
