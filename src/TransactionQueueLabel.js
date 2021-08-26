// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { TransactionQueueModal }    from './TransactionQueueModal';
import React, { useState }          from 'react';
import { observer }                 from 'mobx-react';
import * as UI                      from 'semantic-ui-react';

//================================================================//
// TransactionQueueLabel
//================================================================//
export const TransactionQueueLabel = observer (( props ) => {

    const { accountService } = props;
    const [ open, setOpen ] = useState ( false );

    const queue = accountService.transactionQueue;

    const onClose = () => {
        setOpen ( false );
    }

    const warning           = queue.hasLostTransactions;
    const error             = queue.hasTransactionError;
    const stagedCount       = queue.stagedTransactions.length;
    const pendingCount      = queue.pendingTransactions.length;

    // console.log ( 'QUEUE', queue, queue.appState, queue.hasTransactionError );

    // color = { error ? 'red' : ( warning ? 'orange' : ( stagedCount > 0 ? 'green' : 'grey' ))}

    return (
        <React.Fragment>

            <Choose>

                <When condition = { queue.isLoaded }>
                    <TransactionQueueModal
                        accountService  = { accountService }
                        open            = { open }
                        onClose         = { onClose }
                    />

                    <UI.Label
                        color = { error && 'red' || warning && 'orange' || ( stagedCount > 0 ) && 'green' || 'grey' }
                        onClick = {() => { setOpen ( true )}}
                    >
                        <UI.Icon name = {( error || warning ) && 'exclamation triangle' || 'cloud upload' }/>
                        { error && 'error' || warning && 'warning' || pendingCount && `${ stagedCount }/${ pendingCount }` || `${ stagedCount }` }
                    </UI.Label>
                </When>

                <Otherwise>
                    <UI.Label color = 'grey'>
                        <UI.Icon name = 'circle notched' loading />
                        --
                    </UI.Label>
                </Otherwise>

            </Choose>

        </React.Fragment>
    );
});
