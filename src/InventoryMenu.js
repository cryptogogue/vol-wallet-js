// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import './InventoryScreen.css';

import { AccountInfoService }                               from './AccountInfoService';
import { AccountNavigationBar, ACCOUNT_TABS }               from './AccountNavigationBar';
import { AppStateService }                                  from './AppStateService';
import { CraftingFormController }                           from './CraftingFormController';
import { InventoryFilterDropdown }                          from './InventoryFilterDropdown';
import { InventoryTagsController }                          from './InventoryTagsController';
import { InventoryTagsDropdown }                            from './InventoryTagsDropdown';
import { TransactionFormController_SendAssets }             from './TransactionFormController_SendAssets';
import { TransactionModal }                                 from './TransactionModal';
import { AssetModal, AssetTagsModal, inventoryMenuItems, InventoryController, InventoryViewController, InventoryPrintView, InventoryView } from 'cardmotron';
import { assert, excel, hooks, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import _                                                    from 'lodash';
import { action, computed, extendObservable, observable }   from "mobx";
import { observer }                                         from 'mobx-react';
import React, { useState }                                  from 'react';
import { Redirect }                                         from 'react-router';
import { Link }                                             from 'react-router-dom';
import { Dropdown, Grid, Icon, List, Menu, Loader }         from 'semantic-ui-react';

//================================================================//
// InventoryMenu
//================================================================//
export const InventoryMenu = observer (( props ) => {

    const { appState, controller, printController, craftingFormController, upgradesFormController, tags } = props;
    const [ transactionController, setTransactionController ] = useState ( false );
    const binding = craftingFormController.binding;

    const onClickSendAssets = () => {
        setTransactionController (
            new TransactionFormController_SendAssets (
                appState,
                controller.selection
            )
        );
    }

    const onClickCraftingMethod = ( methodName ) => {

        if ( controller.hasSelection ) {

            const method = binding.methodsByName [ methodName ];
            const paramName = Object.keys ( method.assetArgs )[ 0 ];

            for ( let assetID in controller.selection ) {
                const invocation = craftingFormController.addInvocation ( methodName );
                craftingFormController.setAssetParam ( invocation, paramName, assetID );
            }
        }
        else {
            craftingFormController.addInvocation ( methodName );
        }
        setTransactionController ( craftingFormController );
    }

    const onClickUpgrades = () => {

        upgradesFormController.validate () // make sure the selection gets picked up
        setTransactionController ( upgradesFormController );
    }

    const onCloseTransactionModal = () => {
        setTransactionController ( false );
        controller.clearSelection ();
        craftingFormController.reset ();
    }

    let hasValidMethods = false;
    let methodListItems = [];
    if ( craftingFormController.binding ) {
        
        const methodBindings = binding.getCraftingMethodBindings ();
        for ( let methodName in methodBindings ) {
            
            let disabled = !binding.methodIsValid ( methodName );
            
            if ( controller.hasSelection && !disabled ) {

                const method = binding.methodsByName [ methodName ];

                if ( method.totalAssetsArgs === 1 ) {
                    disabled = false;

                    for ( let assetID in controller.selection ) {
                        if ( !binding.methodIsValid ( methodName, assetID )) {
                            disabled = true;
                            break;
                        }
                    }
                }
                else {
                    disabled = true;
                }
            }

            methodListItems.push (<Dropdown.Item
                key         = { methodName }
                text        = { methodName }
                disabled    = { disabled }
                onClick     = {() => { onClickCraftingMethod ( methodName )}}
            />);

            hasValidMethods = hasValidMethods || !disabled;
        }
    }

    return (
        <React.Fragment>

            <Menu attached = 'top'>
                <inventoryMenuItems.SortModeFragment controller = { controller }/>
                <Menu.Item
                    icon        = { controller.isPrintLayout ? 'circle outline' : ( controller.hideDuplicates ? 'plus square' : 'minus square' )}
                    disabled    = { controller.isPrintLayout }
                    onClick     = {() => { controller.setHideDuplicates ( !controller.hideDuplicates )}}
                />
                <inventoryMenuItems.LayoutOptionsDropdown controller = { controller }/>
                
                <Choose>
                    <When condition = { controller.isPrintLayout }>
                        <Menu.Item
                            name        = 'Download'
                            onClick     = {() => { printController.saveAsZip ()}}
                            disabled    = { !printController.hasPages }
                        >
                            <Icon name = 'download'/>
                        </Menu.Item>
                        <Menu.Item
                            name        = 'Print'
                            onClick     = {() => { window.print ()}}
                            disabled    = { !printController.hasPages }
                        >
                            <Icon name = 'print'/>
                        </Menu.Item>
                    </When>

                    <Otherwise>
                        <inventoryMenuItems.ZoomOptionsDropdown controller = { controller }/>
                    </Otherwise>
                </Choose>
            </Menu>

            <Menu borderless attached = 'bottom'>
                <InventoryTagsDropdown controller = { controller } tags = { tags }/>
                <InventoryFilterDropdown tags = { tags }/>

                <Menu.Menu position = 'right'>
                    <Menu.Item
                        icon        = 'share'
                        disabled    = { !controller.hasSelection }
                        onClick     = {() => { onClickSendAssets ()}}
                    />
                    <Menu.Item
                        icon        = 'gift'
                        disabled    = { upgradesFormController.upgradesWithFilter.length === 0 }
                        onClick     = {() => { onClickUpgrades ()}}
                    />
                    <Dropdown item icon = 'industry' disabled = { !hasValidMethods }>
                        <Dropdown.Menu>
                            { methodListItems }
                        </Dropdown.Menu>
                    </Dropdown>
                </Menu.Menu>
            </Menu>

            <TransactionModal
                appState    = { appState }
                controller  = { transactionController }
                open        = { transactionController !== false }
                onClose     = { onCloseTransactionModal }
            />

        </React.Fragment>
    );
});
