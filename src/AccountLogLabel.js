// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AccountLogModal }          from './AccountLogModal';
import React, { useState }          from 'react';
import { observer }                 from 'mobx-react';
import * as UI                      from 'semantic-ui-react';

//================================================================//
// AccountLogLabel
//================================================================//
export const AccountLogLabel = observer (( props ) => {

    const { accountService } = props;
    const [ open, setOpen ] = useState ( false );

    const onClose = () => {
        setOpen ( false );
    }

    const unread = accountService.transactionQueue.inboxUnread;

    return (
        <React.Fragment>

            <AccountLogModal
                accountService  = { accountService }
                open            = { open }
                onClose         = { onClose }
            />

            <UI.Label color = { unread ? 'green' : 'grey' } onClick = {() => { accountService.transactionQueue.isLoaded && setOpen ( true )}}>
                <UI.Icon name = 'book'/>
                { unread ? unread : 'Log' }
            </UI.Label>

        </React.Fragment>
    );
});
