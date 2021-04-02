// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import './InventoryScreen.css';

import { AccountNavigationBar, ACCOUNT_TABS }               from './AccountNavigationBar';
import { CraftingFormController }                           from './transactions/CraftingFormController';
import { InventoryFilterDropdown }                          from './InventoryFilterDropdown';
import { InventoryMenu }                                    from './InventoryMenu';
import { InventoryTagsDropdown }                            from './InventoryTagsDropdown';
import { AccountStateService }                              from './services/AccountStateService';
import { AppStateService }                                  from './services/AppStateService';
import { SendAssetsFormController }                         from './transactions/SendAssetsFormController';
import { TransactionModal }                                 from './transactions/TransactionModal';
import { UpgradeAssetsFormController }                      from './transactions/UpgradeAssetsFormController';
import { AssetModal, AssetTagsModal, InventoryFilter, inventoryMenuItems, InventoryPrintController, InventoryViewController, InventoryPrintView, InventoryView } from 'cardmotron';
import { assert, hooks, ProgressSpinner, SingleColumnContainerView, util } from 'fgc';
import _                                                    from 'lodash';
import { action, computed, extendObservable, observable }   from "mobx";
import { observer }                                         from 'mobx-react';
import React, { useState }                                  from 'react';
import KeyboardEventHandler                                 from 'react-keyboard-event-handler';
import { Redirect }                                         from 'react-router';
import { Link }                                             from 'react-router-dom';
import { Dropdown, Grid, Icon, List, Menu, Loader }         from 'semantic-ui-react';

//================================================================//
// InventoryScreenBody
//================================================================//
export const InventoryScreen = observer (( props ) => {

    const [ batchSelect, setBatchSelect ]           = useState ( false );
    const [ zoomedAssetID, setZoomedAssetID ]       = useState ( false );
    const [ assetsUtilized, setAssetsUtilized ]     = useState ( false );

    const networkID                 = util.getMatch ( props, 'networkID' );
    const accountID                 = util.getMatch ( props, 'accountID' );

    const appState                  = hooks.useFinalizable (() => new AppStateService ());
    const accountService            = appState.assertAccountService ( networkID, accountID );
    const networkService            = accountService.networkService;

    const progress                  = accountService.inventoryProgress;
    const inventory                 = accountService.inventory;
    const inventoryService          = accountService.inventoryService;
    const tags                      = accountService.inventoryTags;

    const viewFilter = new InventoryFilter ( inventory, ( assetID ) => {
        return tags.isAssetVisible ( assetID ) && !( accountService.assetsUtilized.includes ( assetID ) || inventoryService.isNew ( assetID ));
    });

    const controller                = hooks.useFinalizable (() => new InventoryViewController ( viewFilter ));
    const printController           = hooks.useFinalizable (() => new InventoryPrintController ( controller ));

    const upgradesFilter = new InventoryFilter ( inventory, ( assetID ) => {
        return viewFilter.filterFunc ( assetID ) && ( controller.hasSelection ? controller.isSelected ( assetID ) : true );
    });

    const craftingFormController    = hooks.useFinalizable (() => new CraftingFormController ( accountService, viewFilter ));
    const upgradesFormController    = hooks.useFinalizable (() => new UpgradeAssetsFormController ( accountService, upgradesFilter ));

    const onAssetSelect = ( asset, toggle ) => {
        controller.toggleAssetSelection ( asset );
    }

    const onAssetMagnify = ( asset ) => {
        setZoomedAssetID ( asset.assetID );
    }

    // const onAssetEllipsis = ( asset ) => {
    //     console.log ( 'ELLIPSIS!' );
    // }

    const onDeselect = () => {
        if ( !batchSelect ) {
            controller.clearSelection ();
        }
    }

    const assetIDtoAnchor = ( assetID ) => {
        const assetURL = networkService.getServiceURL ( `/assets/${ assetID }` );
        return <a href = { assetURL } target = '_blank'>{ assetID }</a>
    }

    const hasAssets = ( inventoryService.isLoaded && ( inventory.assetsArray.length > 0 ));

    return (
        <div style = {{
            display: 'flex',
            flexFlow: 'column',
            height: '100vh',
        }}>
            <div className = 'no-print'>
                <SingleColumnContainerView>
                    <AccountNavigationBar
                        accountService          = { accountService }
                        tab                     = { ACCOUNT_TABS.INVENTORY }
                    />
                    <InventoryMenu
                        accountService          = { accountService }
                        controller              = { controller }
                        printController         = { printController }
                        craftingFormController  = { craftingFormController }
                        upgradesFormController  = { upgradesFormController }
                        tags                    = { tags }
                    />
                </SingleColumnContainerView>
            </div>

            <ProgressSpinner loading = {( inventoryService.isLoaded === false ) && progress.loading } message = { inventoryService.isLoaded ? '' : progress.message }>

                <If condition = { hasAssets }>
                    <Choose>
                        <When condition = { controller.isPrintLayout }>
                            <InventoryPrintView
                                key = { printController.pages.length }
                                pages = { printController.pages }
                            />
                        </When>
                        <Otherwise>
                            <KeyboardEventHandler
                                handleKeys      = {[ 'shift', 'alt' ]}
                                handleEventType = 'keydown'
                                onKeyEvent      = {( key, e ) => {
                                    console.log ( 'DOWN' );
                                    setBatchSelect ( true );
                                }}
                            />
                            <KeyboardEventHandler
                                handleKeys      = {[ 'shift', 'alt' ]}
                                handleEventType = 'keyup'
                                onKeyEvent      = {( key, e ) => {
                                    console.log ( 'UP' );
                                    setBatchSelect ( false );
                                }}
                            />
                            <div style = {{ flex: 1 }}>
                                <InventoryView
                                    key         = { `${ controller.sortMode } ${ controller.zoom }` }
                                    controller  = { controller }
                                    onSelect    = { onAssetSelect }
                                    onMagnify   = { batchSelect ? undefined : onAssetMagnify }
                                    onDeselect  = { onDeselect }
                                />
                            </div>
                            <AssetModal
                                controller      = { controller }
                                assetID         = { zoomedAssetID }
                                formatAssetID   = { assetIDtoAnchor }
                                onClose         = {() => { setZoomedAssetID ( false )}}
                            />
                        </Otherwise>
                    </Choose>
                </If>

            </ProgressSpinner>
        </div>
    );
});
