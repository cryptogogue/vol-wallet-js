// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { PasswordInputField }       from './PasswordInputField';
import { TransactionQueueView }     from './TransactionQueueView';
import React, { useState }          from 'react';
import { observer }                 from 'mobx-react';
import * as UI                      from 'semantic-ui-react';

//================================================================//
// TransactionQueueModal
//================================================================//
export const TransactionQueueModal = observer (( props ) => {

    const { accountService, open, onClose } = props;

    const appState      = accountService.appState;
    const queue         = accountService.transactionQueue;

    const [ count, setCount ] = useState ( 0 );
    const [ password, setPassword ] = useState ( '' );

    let clearPassword = () => {
        setPassword ( '' );
        setCount ( count + 1 );
    }
    let onClickSubmit = () => {
        queue.submitTransactions ( password );
        clearPassword ();
    };
    
    let onClickClear = () => {
        queue.clearPendingTransactions ();
        queue.clearStagedTransactions ();
        clearPassword ();
    };

    const allTransactions = queue.pendingTransactions.concat ( queue.stagedTransactions );

    const passwordIsValid = appState.checkPassword ( password );
    const clearEnabled = ( passwordIsValid && queue.canClearTransactions );
    const submitEnabled = ( passwordIsValid && queue.canSubmitTransactions );

    return (
        <UI.Modal
            size = 'small'
            closeIcon
            onClose = {() => { onClose ()}}
            open = { open }
        >
            <UI.Modal.Header>Transaction Queue</UI.Modal.Header>

            <UI.Modal.Content>
                
                <If condition = { queue.hasTransactionError }>
                    <UI.Message
                        error
                        icon = 'exclamation triangle'
                        header = 'Transaction Error Occured'
                        content = { queue.transactionError.message }
                    />
                </If>

                <TransactionQueueView transactions = { allTransactions } error = { queue.transactionError }/>

                <UI.Form>
                    <PasswordInputField
                        key = { count }
                        appState = { appState }
                        setPassword = { setPassword }
                    />
                </UI.Form>
            </UI.Modal.Content>

            <UI.Modal.Actions>

                <UI.Button
                    negative
                    disabled = { !clearEnabled }
                    onClick = { onClickClear }
                >
                    Clear
                </UI.Button>

                <UI.Button
                    positive
                    disabled = { !submitEnabled }
                    onClick = { onClickSubmit }
                >
                    Submit
                </UI.Button>

            </UI.Modal.Actions>
        </UI.Modal>
    );
});
