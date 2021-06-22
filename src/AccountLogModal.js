// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AccountLogView }           from './AccountLogView';
import React, { useState }          from 'react';
import { observer }                 from 'mobx-react';
import * as UI                      from 'semantic-ui-react';

//================================================================//
// AccountLogModal
//================================================================//
export const AccountLogModal = observer (( props ) => {

    const { accountService, open, onClose } = props;

    const transactionQueue  = accountService.transactionQueue;
    const entries           = transactionQueue.history;

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
                <AccountLogView key = { entries.length } accountService = { accountService } entries = { entries }/>
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
