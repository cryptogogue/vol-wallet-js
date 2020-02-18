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

    const { appState, open, onClose } = props;

    const [ count, setCount ] = useState ( 0 );
    const [ password, setPassword ] = useState ( '' );

    let clearPassword = () => {
        setPassword ( '' );
        setCount ( count + 1 );
    }
    let onClickSubmit = () => {
        appState.submitTransactions ( password );
        clearPassword ();
    };
    
    let onClickClear = () => {
        appState.clearPendingTransactions ();
        appState.clearStagedTransactions ();
        clearPassword ();
    };

    const allTransactions = appState.pendingTransactions.concat ( appState.stagedTransactions );

    const passwordIsValid = appState.checkPassword ( password );
    const clearEnabled = ( passwordIsValid && appState.canClearTransactions );
    const submitEnabled = ( passwordIsValid && appState.canSubmitTransactions );

    return (
        <UI.Modal
            size = 'small'
            closeIcon
            onClose = {() => { onClose ()}}
            open = { open }
        >
            <UI.Modal.Header>Staged Transactions</UI.Modal.Header>

            <UI.Modal.Content>
                
                <If condition = { appState.showRejectedWarning }>
                    <UI.Message
                        warning
                        icon = 'warning sign'
                        header = 'Transactions Were Rejected'
                        content = 'One or more transactions have been rejected, possibly due to errors. You may need to clear and resubmit.'
                    />
                </If>

                <TransactionQueueView transactions = { allTransactions }/>

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
