// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { TransactionHistoryView }   from './TransactionHistoryView';
import React, { useState }          from 'react';
import { observer }                 from 'mobx-react';
import * as UI                      from 'semantic-ui-react';

//================================================================//
// TransactionHistoryModal
//================================================================//
export const TransactionHistoryModal = observer (( props ) => {

    const { accountService, open, onClose } = props;

    const transactionQueue  = accountService.transactionQueue;
    const transactions      = transactionQueue.history;

    const unread = accountService.transactionQueue.inboxUnread;

    let onClickMarkAsRead = () => {
        accountService.setInboxRead ( accountService.transactionQueue.history.length );
    }

    return (
        <UI.Modal
            size = 'small'
            closeIcon
            onClose = {() => { onClose ()}}
            open = { open }
        >
            <UI.Modal.Header>Transaction History</UI.Modal.Header>

            <UI.Modal.Content>
                <TransactionHistoryView key = { transactions.length } accountService = { accountService } transactions = { transactions }/>
            </UI.Modal.Content>


            <UI.Modal.Actions>
                <UI.Button
                    positive
                    disabled    = { unread === 0 }
                    onClick     = { onClickMarkAsRead }
                >
                    Mark As Read
                </UI.Button>
            </UI.Modal.Actions>

        </UI.Modal>
    );
});
