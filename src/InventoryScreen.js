// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import './InventoryScreen.css';

import { AccountInfoService }                               from './AccountInfoService';
import { AccountNavigationBar, ACCOUNT_TABS }               from './AccountNavigationBar';
import { AppStateService }                                  from './AppStateService';
import { InventoryFilterDropdown }                          from './InventoryFilterDropdown';
import { InventoryTagController }                           from './InventoryTagController';
import { InventoryTagDropdown }                             from './InventoryTagDropdown';
import { TransactionFormController_SendAssets }             from './TransactionFormController_SendAssets';
import { TransactionModal }                                 from './TransactionModal';
import { AssetModal, AssetTagsModal, inventoryMenuItems, InventoryService, InventoryViewController, InventoryPrintView, InventoryView } from 'cardmotron';
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
const InventoryMenu = observer (( props ) => {

    const { appState, controller, tags } = props;

    const [ transactionController, setTransactionController ]   = useState ( false );

    let methodListItems = [];
    const methodBindings = controller.inventory.getCraftingMethodBindings ();
    for ( let methodName in methodBindings ) {
        const binding = methodBindings [ methodName ];
        const disabled = !binding.valid;
        
        methodListItems.push (<Dropdown.Item
            key = { methodName }
            text = { methodName }
            disabled = { disabled }
            as = { Link }
            to = { `/accounts/${ appState.accountID }/crafting/${ methodName }` }
        />);
    }

    const onClickSendAssets = () => {
        setTransactionController (
            new TransactionFormController_SendAssets (
                appState,
                controller.selection
            )
        );
    }

    const onCloseTransactionModal = () => {
        setTransactionController ( false );
        controller.clearSelection ();
    }

    return (
        <React.Fragment>

            <Menu attached = 'top'>
                <inventoryMenuItems.SortModeFragment        controller = { controller }/>
                <inventoryMenuItems.LayoutOptionsDropdown   controller = { controller }/>
                
                <Choose>
                    <When condition = { controller.isPrintLayout }>
                        <Menu.Item name = "Print" onClick = {() => { window.print ()}}>
                            <Icon name = 'print'/>
                        </Menu.Item>
                    </When>

                    <Otherwise>
                        <inventoryMenuItems.ZoomOptionsDropdown     controller = { controller }/>
                    </Otherwise>
                </Choose>
            </Menu>

            <Menu borderless attached = 'bottom'>
                <InventoryTagDropdown                       controller = { controller } tags = { tags }/>
                <InventoryFilterDropdown                    tags = { tags }/>

                <Menu.Menu position = "right">
                    <Menu.Item
                        icon        = 'envelope'
                        disabled    = { !controller.hasSelection }
                        onClick     = {() => { onClickSendAssets ()}}
                    />
                    <Dropdown item icon = "industry" disabled>
                        <Dropdown.Menu>
                            { methodListItems }
                        </Dropdown.Menu>
                    </Dropdown>
                </Menu.Menu>
            </Menu>

            <TransactionModal
                appState    = { appState }
                controller  = { transactionController }
                onClose     = { onCloseTransactionModal }
            />

        </React.Fragment>
    );
});

//================================================================//
// InventoryScreenBody
//================================================================//
const InventoryScreenBody = observer (( props ) => {

    const { appState }          = props;

    const [ progressMessage, setProgressMessage ]   = useState ( '' );
    const [ zoomedAssetID, setZoomedAssetID ]       = useState ( false );
    const [ assetsUtilized, setAssetsUtilized ]     = useState ( false );

    const nodeURL = appState.hasAccountInfo ? appState.network.nodeURL : false;

    const inventory             = hooks.useFinalizable (() => new InventoryService ( setProgressMessage, nodeURL, appState.accountID ));
    const controller            = hooks.useFinalizable (() => new InventoryViewController ( inventory ));
    const tags                  = hooks.useFinalizable (() => new InventoryTagController ());

    controller.setFilterFunc (( assetID ) => {
        return tags.isAssetVisible ( assetID ) && !appState.assetsUtilized.includes ( assetID );
    });

    const onAssetSelect = ( asset ) => {
        controller.toggleAssetSelection ( asset );
    }

    const onAssetMagnify = ( asset ) => {
        setZoomedAssetID ( asset.assetID );
    }

    // const onAssetEllipsis = ( asset ) => {
    //     console.log ( 'ELLIPSIS!' );
    // }

    const onDeselect = () => {
        controller.clearSelection ();
    }

    const hasAssets = (( inventory.loading === false ) && ( inventory.availableAssetsArray.length > 0 ));

    return (
        <div style = {{
            display: 'flex',
            flexFlow: 'column',
            height: '100vh',
        }}>
            <div className = "no-print">
                <SingleColumnContainerView>
                    <AccountNavigationBar
                        appState    = { appState }
                        tab         = { ACCOUNT_TABS.INVENTORY }
                    />
                    <InventoryMenu
                        appState = { appState }
                        controller = { controller }
                        tags = { tags }
                    />
                </SingleColumnContainerView>
            </div>

            <Choose>

                <When condition = { inventory.loading }>
                    <Loader
                        active
                        inline = 'centered'
                        size = 'massive'
                        style = {{ marginTop:'5%' }}
                    >
                        { progressMessage }
                    </Loader>
                </When>

                <When condition = { hasAssets }>
                    <Choose>
                        <When condition = { controller.isPrintLayout }>
                            <InventoryPrintView
                                key             = { controller.sortMode }
                                inventory       = { controller.inventory }
                                assetArray      = { controller.sortedAssets }
                                layoutName      = { controller.layoutName }
                            />
                        </When>
                        <Otherwise>
                            <div style = {{ flex: 1 }}>
                                <InventoryView
                                    key         = { `${ controller.sortMode } ${ controller.zoom }` }
                                    controller  = { controller }
                                    onSelect    = { onAssetSelect }
                                    onMagnify   = { onAssetMagnify }
                                    onDeselect  = { onDeselect }
                                />
                            </div>
                            <AssetModal
                                inventory       = { controller.inventory }
                                assetID         = { zoomedAssetID }
                                onClose         = {() => { setZoomedAssetID ( false )}}
                            />
                        </Otherwise>
                    </Choose>
                </When>

                <Otherwise>
                </Otherwise>

            </Choose>
        </div>
    );
});

//================================================================//
// InventoryScreen
//================================================================//
export const InventoryScreen = observer (( props ) => {

    const networkIDFromEndpoint = util.getMatch ( props, 'networkID' );
    const accountIDFromEndpoint = util.getMatch ( props, 'accountID' );

    const appState              = hooks.useFinalizable (() => new AppStateService ( networkIDFromEndpoint, accountIDFromEndpoint ));
    const accountInfoService    = hooks.useFinalizable (() => new AccountInfoService ( appState ));

    // TODO: this is a nasty hack to force a reload when the nonce changes. do this right instead.
    return (
        <InventoryScreenBody key = { appState.nonce } appState = { appState }/>
    );
});
