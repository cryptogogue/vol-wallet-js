// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import './InventoryScreen.css';

import { AccountInfoService }                               from './AccountInfoService';
import { AccountNavigationBar, ACCOUNT_TABS }               from './AccountNavigationBar';
import { AppStateService }                                  from './AppStateService';
import { CraftingFormController }                           from './CraftingFormController';
import { InventoryFilterDropdown }                          from './InventoryFilterDropdown';
import { InventoryMenu }                                    from './InventoryMenu';
import { InventoryService }                                 from './InventoryService';
import { InventoryTagController }                           from './InventoryTagController';
import { InventoryTagDropdown }                             from './InventoryTagDropdown';
import KeyboardEventHandler                                 from 'react-keyboard-event-handler';
import { TransactionFormController_SendAssets }             from './TransactionFormController_SendAssets';
import { TransactionModal }                                 from './TransactionModal';
import { AssetModal, AssetTagsModal, inventoryMenuItems, InventoryController, InventoryViewController, InventoryPrintView, InventoryView } from 'cardmotron';
import { assert, hooks, ProgressController, ProgressSpinner, SingleColumnContainerView, util } from 'fgc';
import _                                                    from 'lodash';
import { action, computed, extendObservable, observable }   from "mobx";
import { observer }                                         from 'mobx-react';
import React, { useState }                                  from 'react';
import { Redirect }                                         from 'react-router';
import { Link }                                             from 'react-router-dom';
import { Dropdown, Grid, Icon, List, Menu, Loader }         from 'semantic-ui-react';

//================================================================//
// InventoryScreenBody
//================================================================//
export const InventoryScreen = observer (( props ) => {

    // const { appState }          = props;

    const [ batchSelect, setBatchSelect ]           = useState ( false );
    const [ zoomedAssetID, setZoomedAssetID ]       = useState ( false );
    const [ assetsUtilized, setAssetsUtilized ]     = useState ( false );

    const networkIDFromEndpoint     = util.getMatch ( props, 'networkID' );
    const accountIDFromEndpoint     = util.getMatch ( props, 'accountID' );

    const appState                  = hooks.useFinalizable (() => new AppStateService ( networkIDFromEndpoint, accountIDFromEndpoint ));
    const accountInfoService        = hooks.useFinalizable (() => new AccountInfoService ( appState ));

    const progress                  = hooks.useFinalizable (() => new ProgressController ());
    const inventory                 = hooks.useFinalizable (() => new InventoryController ( progress ));
    const inventoryService          = hooks.useFinalizable (() => new InventoryService ( appState, inventory, progress ));
    const controller                = hooks.useFinalizable (() => new InventoryViewController ( inventory ));
    const craftingFormController    = hooks.useFinalizable (() => new CraftingFormController ( appState, inventory ));
    const tags                      = hooks.useFinalizable (() => new InventoryTagController ());

    controller.setFilterFunc (( assetID ) => {
        return tags.isAssetVisible ( assetID ) && !appState.assetsUtilized.includes ( assetID );
    });

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

    const hasAssets = (( progress.loading === false ) && ( inventory.availableAssetsArray.length > 0 ));

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
                        appState                = { appState }
                        controller              = { controller }
                        craftingFormController  = { craftingFormController }
                        tags                    = { tags }
                    />
                </SingleColumnContainerView>
            </div>

            <ProgressSpinner loading = { progress.loading } message = { progress.message }>

                <If condition = { hasAssets }>
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
                                inventory       = { controller.inventory }
                                assetID         = { zoomedAssetID }
                                onClose         = {() => { setZoomedAssetID ( false )}}
                            />
                        </Otherwise>
                    </Choose>
                </If>

            </ProgressSpinner>
        </div>
    );
});

// //================================================================//
// // InventoryScreen
// //================================================================//
// export const InventoryScreen = observer (( props ) => {

//     const networkIDFromEndpoint = util.getMatch ( props, 'networkID' );
//     const accountIDFromEndpoint = util.getMatch ( props, 'accountID' );

//     const appState              = hooks.useFinalizable (() => new AppStateService ( networkIDFromEndpoint, accountIDFromEndpoint ));
//     const accountInfoService    = hooks.useFinalizable (() => new AccountInfoService ( appState ));

//     // TODO: this is a nasty hack to force a reload when the nonce changes. do this right instead.
//     return (
//         <InventoryScreenBody key = { appState.nonce } appState = { appState }/>
//     );
// });
