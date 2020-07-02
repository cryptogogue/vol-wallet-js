// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { InboxModal }               from './InboxModal';
import React, { useState }          from 'react';
import { observer }                 from 'mobx-react';
import * as UI                      from 'semantic-ui-react';

//================================================================//
// InboxLabel
//================================================================//
export const InboxLabel = observer (( props ) => {

    const { appState } = props;
    const [ open, setOpen ] = useState ( false );
    const [ count, setCount ] = useState ( 0 );

    const onClose = () => {
        setOpen ( false );
        setCount ( count + 1 )
    }

    const inboxSize                     = appState.inventoryService.inboxSize;
    const accountInventoryNonce         = appState.account.inventoryNonce || 0;
    const accountInfoInventoryNonce     = appState.accountInfo.inventoryNonce || 0;
    const showLabel                     = (( accountInventoryNonce < accountInfoInventoryNonce ) && ( inboxSize > 0 ));

    return (
        <React.Fragment>

            <If condition = { showLabel }>

                <InboxModal
                    key         = { `InboxModal:${ count }` }
                    appState    = { appState }
                    open        = { open }
                    onClose     = { onClose }
                />

                <UI.Label
                    color       = 'green'
                    onClick     = {() => { setOpen ( true )}}
                >
                    <UI.Icon name = 'mail'/>
                    { `${ inboxSize }` }
                </UI.Label>

            </If>

        </React.Fragment>
    );
});
