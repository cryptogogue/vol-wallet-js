// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AssetCardView, InventoryWithFilter, inventoryMenuItems, InventoryViewController, InventoryView } from 'cardmotron';
import { assert, excel, hooks, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import * as UI                              from 'semantic-ui-react';

//================================================================//
// StampAssetSelectionModalBody
//================================================================//
const StampAssetSelectionModalBody = observer (( props ) => {

    const { open, onClose }         = props;
    const inventoryViewController   = hooks.useFinalizable (() => new InventoryViewController ( props.controller.filteredInventory, false ));

    const copySelectionAndClose = () => {
        props.controller.setSelection ( inventoryViewController.selection );
        onClose ();
    }

    return (
        <UI.Modal
            closeIcon
            onClose = { copySelectionAndClose }
            open = { open }
        >
            <UI.Modal.Header>{ `Select Assets to Stamp` }</UI.Modal.Header>
            
            <UI.Modal.Content>
                <div style = {{ width: '100%', height: '640px' }}>
                    <InventoryView
                        key         = { `${ inventoryViewController.sortMode }.${ inventoryViewController.zoom }` }
                        controller  = { inventoryViewController }
                        onSelect    = {( asset ) => { inventoryViewController.toggleAssetSelection ( asset )}}
                    />
                </div>
            </UI.Modal.Content>
        </UI.Modal>
    );
});

//================================================================//
// StampAssetSelectionModal
//================================================================//
export const StampAssetSelectionModal = observer (( props ) => {

    const { controller, open, setOpen } = props;

    return (
        <If condition = { open }>
            <StampAssetSelectionModalBody
                controller      = { controller }
                open            = { open }
                onClose         = {() => { setOpen ( false )}}
            />
        </If>
    );
});
