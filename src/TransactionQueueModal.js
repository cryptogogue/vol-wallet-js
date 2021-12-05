// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { PasswordInputField }       from './PasswordInputField';
import { TransactionQueueView }     from './TransactionQueueView';
import React, { useState }          from 'react';
import { observer }                 from 'mobx-react';
import * as UI                      from 'semantic-ui-react';

//================================================================//
// ClearAndResetQueueModal
//================================================================//
const ClearAndResetQueueModal = observer (( props ) => {

    const { accountService, onClose }   = props;
    const [ password, setPassword ]     = useState ( '' );
    const [ busy, setBusy ]             = useState ( false );

    const appState                      = accountService.appState;
    const transactionQueue              = accountService.transactionQueue;

    const onClickClear = async () => {
        setBusy ( true );
        await transactionQueue.clearAndResetAsync ();
        setBusy ( false );
        onClose ();
    } 

    return (
        <UI.Modal
            open
            closeIcon
            size        = 'small'
            onClose     = {() => { onClose ()}}
        >
            <UI.Modal.Header>Clear and Reset Queue</UI.Modal.Header>

            <UI.Modal.Content>

                <UI.Message icon warning>
                    <UI.Icon name = 'warning sign'/>
                    <UI.Message.Content>
                        <UI.Message.Header>Warning</UI.Message.Header>
                        <p>
                            This will clear your queue and local transaction history. It may take a few minutes for your wallet to reset from the network. <b>PENDING and SENT transactions may still go through.</b>
                        </p>
                    </UI.Message.Content>
                </UI.Message>

                <PasswordInputField
                    appState        = { appState }
                    setPassword     = { setPassword }
                    disabled        = { busy }
                />

            </UI.Modal.Content>

            <UI.Modal.Actions>
                <UI.Button
                    negative
                    disabled        = { !password || busy }
                    onClick         = { onClickClear }
                >
                    Clear and Reset
                </UI.Button>
            </UI.Modal.Actions>
        </UI.Modal>
    );
});

//================================================================//
// TransactionQueueModal
//================================================================//
export const TransactionQueueModal = observer (( props ) => {

    const { accountService, open, onClose } = props;
    const [ showClearAndResetModal, setShowClearAndResetModal ] = useState ();

    const appState                      = accountService.appState;
    const transactionQueue              = accountService.transactionQueue;

    const [ count, setCount ]           = useState ( 0 );
    const [ busy, setBusy ]             = useState ( false );
    const [ error, setError ]           = useState ( '' );
    const [ password, setPassword ]     = useState ( '' );

    let clearPassword = () => {
        setPassword ( '' );
        setCount ( count + 1 );
    }
    
    let onClickSubmit = async () => {        
        setBusy ( true );
        setError ( '' );
        clearPassword ();
        await transactionQueue.submitTransactionsAsync ( password );
        setBusy ( false );
    }
    
    let onClickClear = async () => {
        setBusy ( true );
        clearPassword ();
        await transactionQueue.clearUnsentTransactionsAsync ();
        setBusy ( false );
    }

    const transactions      = transactionQueue.queue;

    const passwordIsValid   = appState.checkPassword ( password );
    const clearEnabled      = ( passwordIsValid && transactionQueue.hasUnsentTransactions );
    const submitEnabled     = ( passwordIsValid && transactionQueue.hasUnsentTransactions );

    return (
        <React.Fragment>
            <UI.Modal
                size = 'small'
                closeIcon
                onClose = {() => { onClose ()}}
                open = { open }
            >
                <UI.Modal.Header>Transaction Queue</UI.Modal.Header>

                <UI.Modal.Content>
                    
                    <UI.Menu secondary>
                        <UI.Menu.Menu position = 'right'>
                            <UI.Dropdown
                                item
                                icon = 'settings'
                            >
                                <UI.Dropdown.Menu>
                                    <UI.Dropdown.Item icon = 'redo'     text = 'Clear and Reset Queue'      onClick = {() => { setShowClearAndResetModal ( true ); }}/>
                                </UI.Dropdown.Menu>
                            </UI.Dropdown>
                        </UI.Menu.Menu>
                    </UI.Menu>

                    <If condition = { transactionQueue.hasTransactionError }>
                        <UI.Message
                            error
                            icon            = 'exclamation triangle'
                            header          = 'Transaction Error Occured'
                            content         = { transactionQueue.transactionError.message }
                            onDismiss       = {() => { transactionQueue.setTransactionError ()}}
                        />
                    </If>

                    <TransactionQueueView
                        key                 = { transactions.length }
                        transactionQueue    = { transactionQueue }
                        error               = { transactionQueue.transactionError }
                    />

                    <If condition = { error }>
                        <UI.Message
                            error
                            icon            = 'exclamation triangle'
                            header          = 'Error'
                            content         = { error }
                            onDismiss       = {() => { setError ( '' )}}
                        />
                    </If>

                    <UI.Form>
                        <PasswordInputField
                            key             = { count }
                            appState        = { appState }
                            setPassword     = { setPassword }
                            disabled        = { busy }
                        />
                    </UI.Form>

                </UI.Modal.Content>

                <UI.Modal.Actions>

                    <UI.Button
                        negative
                        disabled            = { busy || !clearEnabled }
                        onClick             = { onClickClear }
                    >
                        Clear
                    </UI.Button>

                    <UI.Button
                        positive
                        disabled            = { busy || !submitEnabled }
                        onClick             = { onClickSubmit }
                        loading             = { busy }
                    >
                        Submit
                    </UI.Button>

                </UI.Modal.Actions>
            </UI.Modal>

            <If condition = { showClearAndResetModal }>
                <ClearAndResetQueueModal
                    accountService          = { accountService }
                    onClose                 = {() => { setShowClearAndResetModal ( false ); }}
                />
            </If>

        </React.Fragment>
    );
});
