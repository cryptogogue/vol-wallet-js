// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { InventoryFilterDropdown } from './InventoryFilterDropdown';
import { InventoryTagsModal } from './InventoryTagsModal';
import { InventorySearch } from './InventorySearch';
import { InventoryQuickFilterPanel } from './InventoryQuickFilterPanel';
import { InventoryTagsManagement } from './InventoryTagsManagement';
import { OfferAssetsFormController } from './transactions/OfferAssetsFormController';
import { SendAssetsFormController } from './transactions/SendAssetsFormController';
import { StampAssetsFormController } from './transactions/StampAssetsFormController';
import { TransactionModal } from './transactions/TransactionModal';
import { inventoryMenuItems, InventoryDownloadModal } from 'cardmotron';
import _ from 'lodash';
import { observer } from 'mobx-react';
import React, { useState } from 'react';
import { Dropdown, Icon, Menu, Tab } from 'semantic-ui-react';

//================================================================//
// InventoryMenu
//================================================================//
export const InventoryMenu = observer((props) => {


    const { accountService, inventoryViewController, printController, craftingFormController, upgradesFormController, tags } = props;
    const [transactionController, setTransactionController] = useState(false);
    const [downloadOptions, setDownloadOptions] = useState(false);
    const binding = craftingFormController.binding;

    const onClickDownloadAssets = () => {

        const assets = inventoryViewController.hasSelection ? Object.values(inventoryViewController.selection) : inventoryViewController.getSortedAssets(false);
        if (assets && (assets.length > 0)) {
            setDownloadOptions({
                assets: assets,
                inventory: inventoryViewController.inventory,
            });
        }
    }

    const onClickDownloadPages = () => {
        if (printController.hasPages) {
            setDownloadOptions({
                pages: printController.pages,
            });
        }
    }

    const onClickOfferAssets = () => {
        setTransactionController(
            new OfferAssetsFormController(
                accountService,
                inventoryViewController.selection
            )
        );
    }

    const onClickSendAssets = () => {
        setTransactionController(
            new SendAssetsFormController(
                accountService,
                inventoryViewController.selection
            )
        );
    }

    const onClickStampAssets = () => {
        setTransactionController(
            new StampAssetsFormController(
                accountService
            )
        );
    }

    const onClickCraftingMethod = (methodName) => {

        if (inventoryViewController.hasSelection) {
            craftingFormController.addBatchInvocation(methodName, inventoryViewController.selection);
        }
        else {
            craftingFormController.addInvocation(methodName);
        }
        setTransactionController(craftingFormController);
    }

    const onClickUpgrades = () => {

        upgradesFormController.validate() // make sure the selection gets picked up
        setTransactionController(upgradesFormController);
    }

    const onCloseTransactionModal = () => {
        setTransactionController(false);
        inventoryViewController.clearSelection();
        craftingFormController.reset();
    }

    let hasValidMethods = false;
    let methodListItems = [];

    for (let methodName in binding.methodsByName) {

        const method = binding.methodsByName[methodName];
        let disabled = !binding.methodIsValid(methodName);

        if (inventoryViewController.hasSelection && !disabled) {

            const method = binding.methodsByName[methodName];

            if ((method.totalAssetsArgs === 1) && (method.constraints.length === 0)) {
                disabled = false;

                for (let assetID in inventoryViewController.selection) {
                    if (!binding.methodIsValid(methodName, assetID)) {
                        disabled = true;
                        break;
                    }
                }
            }
            else {
                disabled = true;
            }
        }

        methodListItems.push(<Dropdown.Item
            key={methodName}
            text={method.friendlyName}
            disabled={disabled}
            onClick={() => { onClickCraftingMethod(methodName) }}
        />);

        hasValidMethods = hasValidMethods || !disabled;
    }

    const isPrintLayout = inventoryViewController.isPrintLayout;
    const hideCollapse = isPrintLayout || !inventoryViewController.hasDuplicates;

    const networkService = accountService.networkService;
    const stampsURL = networkService.marketplaceURL ? `/net/${networkService.networkID}/account/${accountService.accountID}/stamps` : false;

    const panes = [
        {
            menuItem: { key: '1', icon: 'users', content: 'Operations' },
            pane: <Tab.Pane key={1} attached={false} active={true}>
                    <Menu attached='top'>
                        <inventoryMenuItems.SortModeFragment controller={inventoryViewController} />
                        <Menu.Item
                            icon={hideCollapse ? 'circle outline' : (inventoryViewController.hideDuplicates ? 'plus square' : 'minus square')}
                            disabled={hideCollapse}
                            onClick={() => { inventoryViewController.setHideDuplicates(!inventoryViewController.hideDuplicates) }}
                        />
                        <inventoryMenuItems.LayoutOptionsDropdown controller={inventoryViewController} />

                        <Choose>
                            <When condition={isPrintLayout}>
                                <Menu.Item
                                    name='Download'
                                    onClick={onClickDownloadPages}
                                    disabled={!printController.hasPages}
                                >
                                    <Icon name='download' />
                                </Menu.Item>
                                <Menu.Item
                                    name='Print'
                                    onClick={() => { window.print() }}
                                    disabled={!printController.hasPages}
                                >
                                    <Icon name='print' />
                                </Menu.Item>
                            </When>

                            <Otherwise>
                                <inventoryMenuItems.ZoomOptionsDropdown controller={inventoryViewController} />
                                <Menu.Item
                                    name='Download'
                                    onClick={onClickDownloadAssets}
                                    disabled={inventoryViewController.sortedAssets.length === 0}
                                >
                                    <Icon name='download' />
                                </Menu.Item>
                            </Otherwise>
                        </Choose>

                        <Menu.Menu position='right'>
                            <Dropdown
                                item
                                icon='settings'
                            >
                                <Dropdown.Menu>
                                    <Dropdown.Item icon='redo' text='Reset Inventory' onClick={() => { accountService.inventoryService.reset(); }} />
                                </Dropdown.Menu>
                            </Dropdown>
                        </Menu.Menu>
                    </Menu>

                    <Menu borderless attached='bottom'>
                        <InventoryTagsModal controller={inventoryViewController} tags={tags} />
                        <InventoryFilterDropdown tags={tags} />

                        <Menu.Menu position='right'>
                            <Menu.Item
                                icon='dolly'
                                disabled={isPrintLayout || !inventoryViewController.hasSelection}
                                onClick={() => { onClickOfferAssets() }}
                            />
                            <Menu.Item
                                icon='share'
                                disabled={isPrintLayout || !inventoryViewController.hasSelection}
                                onClick={() => { onClickSendAssets() }}
                            />
                            <Menu.Item
                                icon='gift'
                                disabled={isPrintLayout || upgradesFormController.upgradesWithFilter.length === 0}
                                onClick={() => { onClickUpgrades() }}
                            />
                            <Dropdown
                                item
                                icon='industry'
                                disabled={isPrintLayout || !hasValidMethods}
                            >
                                <Dropdown.Menu>
                                    {methodListItems}
                                </Dropdown.Menu>
                            </Dropdown>
                            <Choose>
                                <When condition={stampsURL}>
                                    <Menu.Item
                                        icon='images'
                                        disabled={isPrintLayout}
                                        href={stampsURL}
                                    />
                                </When>
                                <Otherwise>
                                    <Menu.Item
                                        icon='images'
                                        disabled={isPrintLayout}
                                        onClick={() => { onClickStampAssets() }}
                                    />
                                </Otherwise>
                            </Choose>
                        </Menu.Menu>
                    </Menu>

                    <InventoryDownloadModal
                        options={downloadOptions}
                        setOptions={setDownloadOptions}
                    />

                    <TransactionModal
                        accountService={accountService}
                        controller={transactionController}
                        open={transactionController !== false}
                        onClose={onCloseTransactionModal}
                    />
                    <InventorySearch inventory={inventoryViewController.inventory} tags={tags} />
                </Tab.Pane>
        },
        {
            menuItem: { key: '2', icon: 'book', content: 'Deck Building' },
            pane: <Tab.Pane key={2} attached={false}>
                    <InventoryQuickFilterPanel controller={inventoryViewController} inventory={inventoryViewController.inventory} tags={tags} />
                    <InventorySearch inventory={inventoryViewController.inventory} tags={tags} />
                    <InventoryTagsManagement tags={tags} controller={inventoryViewController} />
                </Tab.Pane>
        }
    ];

    return (
        <React.Fragment>
            <Tab menu={{ pointing: true }} panes={panes} renderActiveOnly={false} />
        </React.Fragment>
    );
});
