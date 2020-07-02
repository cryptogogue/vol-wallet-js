// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AssetCardView, InventoryView, InventoryViewController } from 'cardmotron';
import { hooks, ProgressSpinner }           from 'fgc';
import React, { useEffect, useState }       from 'react';
import { action, computed, extendObservable, observable, observe, reaction, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';
import * as UI                              from 'semantic-ui-react';

function getShortDateString () {
    const date = new Date ();
    return ( `${ date.toDateString ()} ${ date.toLocaleTimeString ()}` );
}

//================================================================//
// InboxModal
//================================================================//
export const InboxModal = observer (( props ) => {

    const { appState, open, onClose } = props;

    const progress          = appState.inventoryProgress;
    const inventory         = appState.inventory;
    const inventoryService  = appState.inventoryService;
    const tags              = appState.inventoryTags;

    const [ dateTag ]       = useState ( `New Assets - ${ getShortDateString ()}` );
    const [ tag, setTag ]   = useState ( dateTag );

    const inventoryViewController = hooks.useFinalizable (() => new InventoryViewController ( inventory, false ));

    inventoryViewController.setFilterFunc (( assetID ) => {
        return inventoryService.isNew ( assetID );
    });

    const tagNames = tags.tagNames.slice ( 0 );
    tagNames.push ( dateTag );

    const tagOptions = [];
    for ( let tagName of tagNames ) {
        tagOptions.push (
            <UI.Dropdown.Item
                key         = { tagName }
                text        = { tagName }
                onClick     = {() => { setTag ( tagName )}}
            />
        );
    }

    const onClickSubmit = () => {
        tags.tagSelection ( inventory.assets, tag, true );
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
                
                <div style = {{ width: '100%', height: '320px' }}>
                    <InventoryView
                        controller  = { inventoryViewController }
                    />
                </div>

                <UI.Form>
                    <UI.Form.Field>
                        <UI.Input
                            fluid
                            type = 'text'
                            value = { tag }
                            onChange = {( event ) => { setTag ( event.target.value )}}
                            label = {
                                <UI.Dropdown item icon = 'tags'>
                                    <UI.Dropdown.Menu>
                                        { tagOptions }
                                    </UI.Dropdown.Menu>
                                </UI.Dropdown>
                            }
                            labelPosition = 'left'
                        />
                    </UI.Form.Field>
                </UI.Form>

            </UI.Modal.Content>

            <UI.Modal.Actions>
                <UI.Button
                    fluid
                    positive
                    onClick = { onClickSubmit }
                >
                    OK
                </UI.Button>
            </UI.Modal.Actions>
        </UI.Modal>
    );
});
