// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { InboxService }             from './InboxService';
import { PasswordInputField }       from './PasswordInputField';
import { TransactionQueueView }     from './TransactionQueueView';
import { AssetCardView, InventoryController }      from 'cardmotron';
import { hooks, ProgressController, ProgressSpinner } from 'fgc';
import React, { useState }          from 'react';
import { action, computed, extendObservable, observable, observe, reaction, runInAction } from 'mobx';
import { observer }                 from 'mobx-react';
import * as UI                      from 'semantic-ui-react';

//================================================================//
// InboxModal
//================================================================//
export const InboxModal = observer (( props ) => {

    const { appState, open, onClose } = props;

    const [ count, setCount ] = useState ( 0 );

    const progress      = hooks.useFinalizable (() => new ProgressController ());
    const inventory     = hooks.useFinalizable (() => new InventoryController ( progress ));
    const inboxService  = hooks.useFinalizable (() => new InboxService ( appState, inventory, progress ));

    const assetCards = [];
    for ( let assetID in inventory.assets ) {

        assetCards.push (
            <AssetCardView
                key         = { assetID }
                assetID     = { assetID }
                inventory   = { inventory }
            />
        );
    }

    let onClickSubmit = () => {
        appState.setAccountInventoryNonce ( appState.accountInfo.inventoryNonce );
        onClose ();
    };

    return (
        <UI.Modal
            closeIcon
            onClose = {() => { onClose ()}}
            open = { open }
        >
            <UI.Modal.Header>New Assets</UI.Modal.Header>

            <UI.Modal.Content>
                <UI.Grid columns = { 1 }>
                    <UI.Grid.Column>
                        { assetCards }
                    </UI.Grid.Column>
                </UI.Grid>
            </UI.Modal.Content>

            <UI.Modal.Actions>
                <UI.Button
                    fluid
                    positive
                    onClick = { onClickSubmit }
                    disabled = { progress.loading }
                >
                    OK
                </UI.Button>
            </UI.Modal.Actions>
        </UI.Modal>
    );
});
