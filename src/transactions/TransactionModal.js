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

    const { accountService, open, onClose }                         = props;
    const [ count, setCount ]                                       = useState ( 0 );
    const [ busy, setBusy ]                                         = useState ( false );
    const [ error, setError ]                                       = useState ( '' );
    const [ password, setPassword ]                                 = useState ( '' );
    const [ controllerFromDropdown, setControllerFromDropdown ]     = useState ( false );
    
    const appState          = accountService.appState;
    const controller        = props.controller || controllerFromDropdown;
    const queue             = accountService.transactionQueue;

    const showDropdown      = !props.controller;
    const title             = controller ? controller.friendlyName : 'New Transaction';
    const stageEnabled      = accountService.hasAccountInfo && controller && controller.isCompleteAndErrorFree;
    const submitEnabled     = stageEnabled && appState.checkPassword ( password );
    const submitLabel       = queue.stagedTransactions.length > 0 ? 'Submit Transactions' : 'Submit Transaction';

    let clearPassword = () => {
        setPassword ( '' );
        setCount ( count + 1 );
    }

    const stage = async () => {

        setBusy ( true );
        setError ( '' );

        await queue.stageTransactionAsync ( controller.transaction );

        setBusy ( false );
        onClose ();
    }

    const submit = async () => {

        setBusy ( true );
        setError ( '' );
        clearPassword ();

        const nonce = await queue.findNonceAsync ( accountService.accountID );
        if ( nonce === false ) {
            setError ( 'Could not synchronize nonce. Try again or stage transaction for later.' );
            setBusy ( false );
            return;
        }

        await queue.stageTransactionAsync ( controller.transaction );
        await queue.submitTransactionsAsync ( password, nonce );

        setBusy ( false );
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
                        accountService      = { accountService }
                        controller          = { controller }
                        setController       = { setControllerFromDropdown }
                        menu                = { props.menu }
                        disabled            = { busy }
                    />
                </If>
                
                <If condition = { controller }>
                    <TransactionForm controller = { controller } disabled = { busy }/>
                </If>

                <If condition = { error }>
                    <UI.Message
                        error
                        icon                = 'exclamation triangle'
                        header              = 'Error'
                        content             = { error }
                        onDismiss           = {() => { setError ( '' )}}
                    />
                </If>

                <UI.Form>
                    <PasswordInputField
                        key                 = { count }
                        appState            = { appState }
                        setPassword         = { setPassword }
                        disabled            = { busy }
                    />
                </UI.Form>

            </UI.Modal.Content>

            <UI.Modal.Actions>

                <UI.Button
                    positive
                    disabled            = { busy || submitEnabled || !stageEnabled }
                    onClick             = {() => { stage ()}}
                >
                    Stage Transaction
                </UI.Button>

                <UI.Button
                    positive
                    disabled            = { busy || !submitEnabled }
                    onClick             = {() => { submit ()}}
                    loading             = { busy }
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

    const { accountService } = props;
    const [ counter, setCounter ] = useState ( 0 );

    const onClose = () => {
        setCounter ( counter + 1 );
        props.onClose ();
    }

    return (
        <div key = { `${ counter }` }>
            <TransactionModalBody
                accountService          = { accountService }
                open                    = { props.open }
                onClose                 = { onClose }
                controller              = { props.controller || false }
                menu                    = { props.menu }
            />
        </div>
    );
});
