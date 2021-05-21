// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AccountNavigationBar, ACCOUNT_TABS }               from './AccountNavigationBar';
import { CraftingFormController }                           from './transactions/CraftingFormController';
import { InventoryFilterDropdown }                          from './InventoryFilterDropdown';
import { InventoryTagsDropdown }                            from './InventoryTagsDropdown';
import { AppStateService }                                  from './services/AppStateService';
import { SendAssetsFormController }                         from './transactions/SendAssetsFormController';
import { OfferAssetsFormController }                        from './transactions/OfferAssetsFormController';
import { TransactionModal }                                 from './transactions/TransactionModal';
import { AssetModal, AssetTagsModal, inventoryMenuItems, InventoryController, InventoryDownloadModal, InventoryViewController, InventoryPrintView, InventoryView } from 'cardmotron';
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

    const { accountService, controller, printController, craftingFormController, upgradesFormController, tags } = props;
    const [ transactionController, setTransactionController ] = useState ( false );
    const [ downloadOptions, setDownloadOptions ] = useState ( false );
    const binding = craftingFormController.binding;

    const onClickDownloadAssets = () => {

        const assets = controller.hasSelection ? Object.values ( controller.selection ) : controller.getSortedAssets ( false );
        if ( assets && ( assets.length > 0 )) {
            setDownloadOptions ({
                assets:     assets,
                inventory:  controller.inventory,
            });
        }
    }

    const onClickDownloadPages = () => {
        
        if ( printController.hasPages ) {
            setDownloadOptions ({
                pages:  printController.pages,
            });
        }
    }

    const onClickOfferAssets = () => {
        setTransactionController (
            new OfferAssetsFormController (
                accountService,
                controller.selection
            )
        );
    }

    const onClickSendAssets = () => {
        setTransactionController (
            new SendAssetsFormController (
                accountService,
                controller.selection
            )
        );
    }

    const onClickCraftingMethod = ( methodName ) => {

        if ( controller.hasSelection ) {
            craftingFormController.addBatchInvocation ( methodName, controller.selection );
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
        
    for ( let methodName in binding.methodsByName ) {
        
        const method = binding.methodsByName [ methodName ];
        let disabled = !binding.methodIsValid ( methodName );
        
        if ( controller.hasSelection && !disabled ) {

            const method = binding.methodsByName [ methodName ];

            if (( method.totalAssetsArgs === 1 ) && ( method.constraints.length === 0 )) {
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
            text        = { method.friendlyName }
            disabled    = { disabled }
            onClick     = {() => { onClickCraftingMethod ( methodName )}}
        />);

        hasValidMethods = hasValidMethods || !disabled;
    }

    const isPrintLayout = controller.isPrintLayout;
    const hideCollapse = isPrintLayout || !controller.hasDuplicates;

    return (
        <React.Fragment>

            <Menu attached = 'top'>
                <inventoryMenuItems.SortModeFragment controller = { controller }/>
                <Menu.Item
                    icon        = { hideCollapse ? 'circle outline' : ( controller.hideDuplicates ? 'plus square' : 'minus square' )}
                    disabled    = { hideCollapse }
                    onClick     = {() => { controller.setHideDuplicates ( !controller.hideDuplicates )}}
                />
                <inventoryMenuItems.LayoutOptionsDropdown controller = { controller }/>
                
                <Choose>
                    <When condition = { isPrintLayout }>
                        <Menu.Item
                            name        = 'Download'
                            onClick     = { onClickDownloadPages }
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
                        <Menu.Item
                            name        = 'Download'
                            onClick     = { onClickDownloadAssets }
                            disabled    = { controller.sortedAssets.length === 0 }
                        >
                            <Icon name = 'download'/>
                        </Menu.Item>
                    </Otherwise>
                </Choose>
            </Menu>

            <Menu borderless attached = 'bottom'>
                <InventoryTagsDropdown controller = { controller } tags = { tags }/>
                <InventoryFilterDropdown tags = { tags }/>

                <Menu.Menu position = 'right'>
                    <Menu.Item
                        icon        = 'dolly'
                        disabled    = { isPrintLayout || !controller.hasSelection }
                        onClick     = {() => { onClickOfferAssets ()}}
                    />
                    <Menu.Item
                        icon        = 'share'
                        disabled    = { isPrintLayout || !controller.hasSelection }
                        onClick     = {() => { onClickSendAssets ()}}
                    />
                    <Menu.Item
                        icon        = 'gift'
                        disabled    = { isPrintLayout || upgradesFormController.upgradesWithFilter.length === 0 }
                        onClick     = {() => { onClickUpgrades ()}}
                    />
                    <Dropdown
                        item
                        icon        = 'industry'
                        disabled    = { isPrintLayout || !hasValidMethods }
                    >
                        <Dropdown.Menu>
                            { methodListItems }
                        </Dropdown.Menu>
                    </Dropdown>
                </Menu.Menu>
            </Menu>

            <InventoryDownloadModal
                options             = { downloadOptions }
                setOptions          = { setDownloadOptions }
            />

            <TransactionModal
                accountService      = { accountService }
                controller          = { transactionController }
                open                = { transactionController !== false }
                onClose             = { onCloseTransactionModal }
            />

        </React.Fragment>
    );
});
