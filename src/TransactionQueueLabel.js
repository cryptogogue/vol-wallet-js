// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { PasswordInputField }       from './PasswordInputField';
import { TransactionQueueModal }    from './TransactionQueueModal';
import React, { useState }          from 'react';
import { observer }                 from 'mobx-react';
import * as UI                      from 'semantic-ui-react';

//================================================================//
// TransactionQueueLabel
//================================================================//
export const TransactionQueueLabel = observer (( props ) => {

    const { appState } = props;
    const [ open, setOpen ] = useState ( false );

    const onClose = () => {
        setOpen ( false );
    }

    const stagedCount       = appState.stagedTransactions.length;
    const pendingCount      = appState.pendingTransactions.length;

    return (
        <React.Fragment>

            <TransactionQueueModal
                appState = { appState }
                open = { open }
                onClose = { onClose }
            />

            <UI.Label
                color = { stagedCount > 0 ? 'green' : 'grey' }
                onClick = {() => { setOpen ( true )}}
            >
                <UI.Icon name = 'cloud upload'/>
                { pendingCount ? `${ stagedCount }/${ pendingCount }` : `${ stagedCount }` }
            </UI.Label>

        </React.Fragment>
    );
});
