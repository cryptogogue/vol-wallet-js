// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { InventoryWithFilter, InventoryView, InventoryViewController } from 'cardmotron';
import { hooks }                            from 'fgc';
import React, { useState }                  from 'react';
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

    const { accountService, open, onClose } = props;

    const progress          = accountService.inventoryProgress;
    const inventory         = accountService.inventory;
    const inventoryService  = accountService.inventoryService;
    const tags              = accountService.inventoryTags;

    const [ dateTag ]       = useState ( `New Assets - ${ getShortDateString ()}` );
    const [ tag, setTag ]   = useState ( dateTag );

    const filter = ( assetID ) => {
        return inventoryService.isNew ( assetID );
    }

    const renderAsync = async ( schema, asset ) => {
        return await inventoryService.getAssetSVGAsync ( asset.assetID );
    }

    const inventoryViewController = hooks.useFinalizable (() => new InventoryViewController ( new InventoryWithFilter ( inventory, filter ), false, false, renderAsync ));

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
        tags.tagSelection ( inventoryService.newAssets, tag, true );
        inventoryService.clearInbox ();
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
