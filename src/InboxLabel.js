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

    const accountInventoryNonce = appState.account.inventoryNonce || 0;
    const accountInfoInventoryNonce = appState.accountInfo.inventoryNonce || 0;
    const newAssets = appState.accountInfo && appState.accountInfo.newAssets || [];
    const showLabel = (( accountInventoryNonce < accountInfoInventoryNonce ) && ( newAssets.length > 0 ));

    return (
        <React.Fragment>

            <If condition = { showLabel }>

                <InboxModal
                    key         = { `InboxModal:${ count }` }
                    appState    = { appState }
                    open        = { open }
                    onClose     = { onClose }
                    tags        = { props.tags }
                />

                <UI.Label
                    color       = 'green'
                    onClick     = {() => { setOpen ( true )}}
                >
                    <UI.Icon name = 'mail'/>
                    { `${ newAssets.length }` }
                </UI.Label>

            </If>

        </React.Fragment>
    );
});
