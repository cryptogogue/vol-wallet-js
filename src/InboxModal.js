// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { InboxService }                 from './InboxService';
import { InventoryTagsController }      from './InventoryTagsController';
import { AssetCardView, InventoryController } from 'cardmotron';
import { hooks, ProgressController, ProgressSpinner } from 'fgc';
import React, { useEffect, useState }   from 'react';
import { action, computed, extendObservable, observable, observe, reaction, runInAction } from 'mobx';
import { observer }                     from 'mobx-react';
import * as UI                          from 'semantic-ui-react';

function getShortDateString () {
    const date = new Date ();
    return ( `${ date.toDateString ()} ${ date.toLocaleTimeString ()}` );
}

//================================================================//
// InboxModalCardList
//================================================================//
export const InboxModalCardList = observer (( props ) => {

    const { appState, inventory, progress } = props;

    const inboxService = hooks.useFinalizable (() => new InboxService ( appState, inventory, progress ));

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

    return (
        <Choose>
            <When condition = { progress.loading}>
                <UI.Message icon>
                    <UI.Icon name = 'circle notched' loading/>
                    <UI.Message.Content>
                        { progress.message }
                    </UI.Message.Content>
                </UI.Message>
            </When>

            <Otherwise>
                <UI.Grid columns = { 1 }>
                    <UI.Grid.Column>
                        { assetCards }
                    </UI.Grid.Column>
                </UI.Grid>
            </Otherwise>
        </Choose>
    );
});

//================================================================//
// InboxModal
//================================================================//
export const InboxModal = observer (( props ) => {

    const { appState, open, onClose } = props;

    const progress          = hooks.useFinalizable (() => new ProgressController ());
    const inventory         = hooks.useFinalizable (() => new InventoryController ( progress ));
    const tags              = props.tags ? props.tags : hooks.useFinalizable (() => new InventoryTagsController ( progress ));

    const [ dateTag ]       = useState ( `New Assets - ${ getShortDateString ()}` );
    const [ tag, setTag ]   = useState ( dateTag );

    const assetCards = [];
    if ( !progress.loading ) {

        for ( let assetID in inventory.assets ) {
            assetCards.push (
                <AssetCardView
                    key         = { assetID }
                    assetID     = { assetID }
                    inventory   = { inventory }
                />
            );
        }
    }

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
                <InboxModalCardList
                    appState    = { appState }
                    inventory   = { inventory }
                    progress    = { progress }
                />

                <UI.Form>
                    <UI.Form.Field>
                        <UI.Input
                            fluid
                            type = 'text'
                            value = { tag }
                            onChange = {( event ) => { setTag ( event.target.value )}}
                            label = {
                                <UI.Dropdown item icon = 'tags' disabled = { progress.loading }>
                                    <UI.Dropdown.Menu>
                                        { tagOptions }
                                    </UI.Dropdown.Menu>
                                </UI.Dropdown>
                            }
                            labelPosition = 'left'
                            disabled = { progress.loading }
                        />
                    </UI.Form.Field>
                </UI.Form>

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
