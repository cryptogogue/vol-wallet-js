// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { TransactionBalanceHeader, TransactionFormFields } from './BasicTransactionForm';
import { TransactionFormInput }             from './TransactionFormInput';
import { AssetCardView, inventoryMenuItems, InventoryViewController, InventoryView } from 'cardmotron';
import { assert, excel, hooks, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import * as UI                              from 'semantic-ui-react';

//================================================================//
// CraftingAssetSelectionModal
//================================================================//
export const CraftingAssetSelectionModal = observer (( props ) => {

    const craftingFormController = props.controller;
    const { paramModalState, setParamModalState } = props;
    const [ closeTimeout, setCloseTimeout ] = useState ( false );

    const inventoryViewController = hooks.useFinalizable (() => new InventoryViewController ( craftingFormController.inventory, false ));

    if ( paramModalState === false ) {
        return ( <React.Fragment/> );
    }

    const { invocation, paramName } = paramModalState;
    const allOptions        = invocation.methodBinding.getParamOptions ( paramName );
    const availableOptions  = invocation.methodBinding.getParamOptions ( paramName, invocation.assetParams );

    inventoryViewController.setFilterFunc (( assetID ) => {
        return allOptions.includes ( assetID );
    });

    const isSelected = ( assetID ) => {
        return ( invocation.assetParams [ paramName ] === assetID );
    }

    const isDisabled = ( assetID ) => {
        return !( isSelected ( assetID ) || availableOptions.includes ( assetID ));
    }

    const onSelect = ( asset, selected ) => {

        if ( !closeTimeout ) {
            craftingFormController.setAssetParam ( invocation, paramName, selected ? asset.assetID : false );
            if ( selected ) {
                setCloseTimeout ( setTimeout(() => {
                    setCloseTimeout ( false );
                    setParamModalState ( false );
                }, 350 ));
            }
        }
    }

    return (
        <UI.Modal
            closeIcon
            onClose = {() => {
                if ( closeTimeout ) {
                    clearTimeout ( closeTimeout );
                    setCloseTimeout ( false );
                }
                setParamModalState ( false )
            }}
            open = { paramModalState !== false }
        >
            <UI.Modal.Header>{ `Select Asset for '${ paramName }'` }</UI.Modal.Header>
            
            <UI.Modal.Content>
                <div style = {{ width: '100%', height: '640px' }}>
                    <InventoryView
                        key         = { `${ inventoryViewController.sortMode } ${ inventoryViewController.zoom }` }
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
