// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AssetCardView, InventoryWithFilter, inventoryMenuItems, InventoryViewController, InventoryView } from 'cardmotron';
import { assert, excel, hooks, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import * as UI                              from 'semantic-ui-react';

//================================================================//
// CraftingAssetSelectionModalController
//================================================================//
class CraftingAssetSelectionModalController {

    @observable closeTimeout;

    //----------------------------------------------------------------//
    @action
    clear () {
        this.revocable.revokeAll ();
        this.closeTimeout = false;
    }

    //----------------------------------------------------------------//
    constructor ( networkService, onDone ) {

        this.revocable          = new RevocableContext ();
    }

    //----------------------------------------------------------------//
    finalize () {

        this.revocable.finalize ();
    }

    //----------------------------------------------------------------//
    @action
    scheduleClose ( doClose ) {

        this.closeTimeout = this.revocable.timeout (() => {
            runInAction (() => {
                this.closeTimeout = false;
            });
            doClose ();
        }, 350 );
    }
}

//================================================================//
// CraftingAssetSelectionModal
//================================================================//
export const CraftingAssetSelectionModal = observer (( props ) => {

    const craftingFormController = props.controller;
    const { paramModalState, setParamModalState } = props;

    const inventoryService = craftingFormController.accountService.inventoryService;

    const renderAsync = async ( schema, asset ) => {
        return await inventoryService.getAssetSVGAsync ( asset.assetID );
    }

    const inventoryViewController   = hooks.useFinalizable (() => new InventoryViewController ( craftingFormController.inventory, false, false, renderAsync ));
    const controller                = hooks.useFinalizable (() => new CraftingAssetSelectionModalController ());

    if ( paramModalState === false ) {
        return ( <React.Fragment/> );
    }

    const { invocation, paramName } = paramModalState;
    const allOptions        = invocation.methodBinding.getParamOptions ( paramName );
    const availableOptions  = invocation.methodBinding.getParamOptions ( paramName, invocation.assetParams );

    inventoryViewController.setInventory ( new InventoryWithFilter ( craftingFormController.inventory, ( assetID ) => {
        return allOptions.includes ( assetID );
    }));

    const isSelected = ( assetID ) => {
        return ( invocation.assetParams [ paramName ] === assetID );
    }

    const isDisabled = ( assetID ) => {
        return !( isSelected ( assetID ) || availableOptions.includes ( assetID ));
    }

    const onSelect = ( asset, selected ) => {

        if ( !controller.closeTimeout ) {
            craftingFormController.setAssetParam ( invocation, paramName, selected ? asset.assetID : false );
            if ( selected ) {
                controller.scheduleClose (() => {
                    setParamModalState ( false );
                });
            }
        }
    }

    return (
        <UI.Modal
            closeIcon
            onClose = {() => {
                controller.clear ();
                setParamModalState ( false )
            }}
            open = { paramModalState !== false }
        >
            <UI.Modal.Header>{ `Select Asset for '${ paramName }'` }</UI.Modal.Header>
            
            <UI.Modal.Content>
                <div style = {{ width: '100%', height: '640px' }}>
                    <InventoryView
                        key         = { `${ inventoryViewController.sortMode }.${ inventoryViewController.zoom }` }
                        controller  = { inventoryViewController }
                        onSelect    = { onSelect }
                        isSelected  = { isSelected }
                        isDisabled  = { isDisabled }
                    />
                </div>
            </UI.Modal.Content>
        </UI.Modal>
    );
});
