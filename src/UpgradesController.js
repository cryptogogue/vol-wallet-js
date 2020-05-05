// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AccountInfoService }                               from './AccountInfoService';
import { AccountNavigationBar, ACCOUNT_TABS }               from './AccountNavigationBar';
import { AppStateService }                                  from './AppStateService';
import { InventoryFilterDropdown }                          from './InventoryFilterDropdown';
import { InventoryTagController }                           from './InventoryTagController';
import { InventoryTagDropdown }                             from './InventoryTagDropdown';
import { TransactionFormController_UpgradeAssets }          from './TransactionFormController';
import { TransactionModal }                                 from './TransactionModal';
import { AssetModal, AssetTagsModal, inventoryMenuItems, InventoryController, InventoryViewController, InventoryPrintView, InventoryView } from 'cardmotron';
import { assert, hooks, ProgressController, ProgressSpinner, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import _                                                    from 'lodash';
import { action, computed, extendObservable, observable }   from "mobx";
import { observer }                                         from 'mobx-react';
import React, { useState }                                  from 'react';
import { Link }                                             from 'react-router-dom';
import * as UI                                              from 'semantic-ui-react';

//================================================================//
// UpgradesController
//================================================================//
export class UpgradesController {

    @observable upgrades = false;

    //----------------------------------------------------------------//
    @action
    affirm ( inventory, appState ) {

        if ( this.upgrades ) return;

        const assetsUtilized = appState ? appState.assetsUtilized : [];

        this.inventory = inventory;

        const assets = inventory.availableAssetsArray;
        if ( !assets.length ) return;

        const upgrades = [];

        for ( let asset of assets ) {

            if ( assetsUtilized.includes ( asset.assetID )) continue;

            const forAsset = inventory.schema.getUpgradesForAsset ( asset );
            if ( forAsset ) {
                upgrades.push ({
                    asset:      asset,
                    assetID:    asset.assetID,
                    selected:   forAsset [ forAsset.length - 1 ],
                    options:    forAsset,
                });
            }
        }
        this.upgrades = upgrades;
    }

    //----------------------------------------------------------------//
    @action
    clear () {

        this.upgrades = false;
    }

    //----------------------------------------------------------------//
    constructor () {
    }

    //----------------------------------------------------------------//
    @action
    enableAll ( enabled ) {

        for ( let upgrade of this.upgrades ) {
            upgrade.selected = enabled ? upgrade.options [ upgrade.options.length - 1 ] : upgrade.asset.type;
        }
    }

    //----------------------------------------------------------------//
    finalize () {
    }

    //----------------------------------------------------------------//
    getFriendlyName ( option ) {

        if ( this.inventory ) {
            const definition = this.inventory.schema.definitions [ option ];
            return definition.fields.name ? definition.fields.name.value : option;
        }
        return option;
    }

    //----------------------------------------------------------------//
    @action
    isEnabled ( upgradeID ) {

        const upgrade = this.upgrades [ upgradeID ];
        return ( upgrade.asset.type !== upgrade.selected );
    }

    //----------------------------------------------------------------//
    @action
    select ( upgradeID, option ) {

        this.upgrades [ upgradeID ].selected = option;
    }

    //----------------------------------------------------------------//
    @action
    toggle ( upgradeID ) {

        const upgrade = this.upgrades [ upgradeID ];
        const max = upgrade.options [ upgrade.options.length - 1 ];

        upgrade.selected = ( upgrade.asset.type === upgrade.selected ) ? max : upgrade.asset.type;
    }

    //----------------------------------------------------------------//
    @computed get
    total () {

        return this.upgrades ? this.upgrades.length : 0;
    }

    //----------------------------------------------------------------//
    @computed get
    totalEnabled () {

        if ( !this.upgrades ) return 0;
        
        let enabled = 0;
        for ( let upgrade of this.upgrades ) {
            if ( upgrade.asset.type !== upgrade.selected ) {
                ++enabled;
            }
        }
        return enabled;
    }

    // //----------------------------------------------------------------//
    // @computed get
    // upgradeAssets () {

    //     const map = {};
    //     if ( this.upgrades ) {
    //         for ( let upgrade of this.upgrades ) {
    //             if ( upgrade.asset.type !== upgrade.selected ) {
    //                 map [ upgrade.assetID ] = this.inventory.assets [ upgrade.assetID ];
    //             }
    //         }
    //     }
    //     return map;
    // }

    //----------------------------------------------------------------//
    @computed get
    upgradeMap () {

        const map = {};
        if ( this.upgrades ) {
            for ( let upgrade of this.upgrades ) {
                if ( upgrade.asset.type !== upgrade.selected ) {
                    map [ upgrade.assetID ] = upgrade.selected;
                }
            }
        }
        return map;
    }
};
