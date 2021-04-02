// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { InboxModal }               from './InboxModal';
import React, { useState }          from 'react';
import { observer }                 from 'mobx-react';
import * as UI                      from 'semantic-ui-react';

//================================================================//
// InboxLabel
//================================================================//
export const InboxLabel = observer (( props ) => {

    const { accountService } = props;
    const [ open, setOpen ] = useState ( false );
    const [ count, setCount ] = useState ( 0 );

    const appState = accountService;

    const onClose = () => {
        setOpen ( false );
        setCount ( count + 1 )
    }

    const inventoryService              = accountService.inventoryService;
    const inboxSize                     = inventoryService.inboxSize;
    const showLabel                     = ( inboxSize > 0 );

    return (
        <React.Fragment>

            <If condition = { showLabel }>

                <InboxModal
                    key                 = { `InboxModal:${ count }` }
                    accountService      = { accountService }
                    open                = { open }
                    onClose             = { onClose }
                />

                <UI.Label
                    color               = 'green'
                    onClick             = {() => { setOpen ( true )}}
                >
                    <UI.Icon name = 'mail'/>
                    { `${ inboxSize }` }
                </UI.Label>

            </If>

        </React.Fragment>
    );
});
