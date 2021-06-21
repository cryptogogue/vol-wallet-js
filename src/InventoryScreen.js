// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

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
import { AssetModal, AssetTagsModal, InventoryWithFilter, INVENTORY_FILTER_STATUS, inventoryMenuItems, InventoryPrintController, InventoryViewController, InventoryPrintView, InventoryView } from 'cardmotron';
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

    if ( AppStateService.needsReset ()) return (<Redirect to = { '/util/reset' }/>);

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

    const viewFilter = ( assetID ) => {

        if ( tags.isAssetVisible ( assetID ) && !inventoryService.isNew ( assetID )) {

            const asset = inventory.assets [ assetID ];
            if ( asset.offerID !== undefined ) return INVENTORY_FILTER_STATUS.DISABLED;

            const assetsFiltered = accountService.assetsFiltered;
            return _.has ( assetsFiltered, assetID ) ? assetsFiltered [ assetID ] : true;
        }
        return false;
    }

    const inventoryViewController   = hooks.useFinalizable (() => new InventoryViewController ( new InventoryWithFilter ( inventory, viewFilter ), undefined, true ));
    const printController           = hooks.useFinalizable (() => new InventoryPrintController ( inventoryViewController ));

    const upgradesFilter = ( assetID ) => {
        return inventoryViewController.inventory.isVisible ( assetID ) && !inventoryViewController.inventory.isDisabled ( assetID ) && ( inventoryViewController.hasSelection ? inventoryViewController.isSelected ( assetID ) : true );
    }

    const craftingFormController    = hooks.useFinalizable (() => new CraftingFormController ( accountService ));
    const upgradesFormController    = hooks.useFinalizable (() => new UpgradeAssetsFormController ( accountService, new InventoryWithFilter ( inventory, upgradesFilter )));

    const onAssetSelect = ( asset ) => {
        inventoryViewController.toggleAssetSelection ( asset );
    }

    const onAssetMagnify = ( asset ) => {
        setZoomedAssetID ( asset.assetID );
    }

    // const onAssetEllipsis = ( asset ) => {
    //     console.log ( 'ELLIPSIS!' );
    // }

    const onDeselect = () => {
        if ( !batchSelect ) {
            inventoryViewController.clearSelection ();
        }
    }

    const assetIDtoAnchor = ( assetID ) => {
        const assetURL = networkService.getServiceURL ( `/assets/${ assetID }` );
        return <a href = { assetURL } target = '_blank'>{ assetID }</a>
    }

    const hasAssets = ( inventoryService.isLoaded && ( inventoryViewController.assetsArray.length > 0 ));

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
                        controller              = { inventoryViewController }
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
                        <When condition = { inventoryViewController.isPrintLayout }>
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
                                    key         = { `${ inventoryService.nonce }.${ inventoryViewController.sortMode }.${ inventoryViewController.zoom }` }
                                    controller  = { inventoryViewController }
                                    onSelect    = { onAssetSelect }
                                    onMagnify   = { batchSelect ? undefined : onAssetMagnify }
                                    onDeselect  = { onDeselect }
                                />
                            </div>
                            <AssetModal
                                controller      = { inventoryViewController }
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
