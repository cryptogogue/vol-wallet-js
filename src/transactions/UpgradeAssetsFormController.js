// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { Transaction, TRANSACTION_TYPE }    from './Transaction';
import { TransactionFormController }        from './TransactionFormController';
import { assert, randomBytes, util }        from 'fgc';
import _                                    from 'lodash';
import { action, computed, extendObservable, observable, observe, reaction, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';

//================================================================//
// UpgradeAssetsFormController
//================================================================//
export class UpgradeAssetsFormController extends TransactionFormController {

    @observable inventory               = false;
    @observable upgrades                = [];
    @observable assetsWithUpgrades      = [];

    //----------------------------------------------------------------//
    constructor ( appState, inventory ) {
        super ();

        runInAction (() => {
            this.inventory = inventory; // needed by UpgradeAssetsForm
        });

        this.initialize ( appState, TRANSACTION_TYPE.UPGRADE_ASSETS );

        this.cancelRebuildReaction = reaction (
            () => {
                return inventory.assets;
            },
            ( params ) => {
                this.rebuild ( appState, inventory );
            }
        );
    }

    //----------------------------------------------------------------//
    @action
    enableAll ( enabled ) {

        for ( let upgrade of this.upgrades ) {
            upgrade.selected = enabled ? upgrade.options [ upgrade.options.length - 1 ] : upgrade.asset.type;
        }
        this.validate ();
    }

    //----------------------------------------------------------------//
    finalize () {

        this.cancelRebuildReaction ();
    }

    //----------------------------------------------------------------//
    hasUpgrade ( assetID ) {

        return this.assetsWithUpgrades.includes ( assetID );
    }

    //----------------------------------------------------------------//
    @action
    isEnabled ( upgradeID ) {

        const upgrade = this.upgrades [ upgradeID ];
        return ( upgrade.asset.type !== upgrade.selected );
    }

    //----------------------------------------------------------------//
    @action
    rebuild ( appState, inventory ) {

        const assets = inventory.assetsArray;
        if ( !assets.length ) return;

        const upgrades = [];
        const assetsWithUpgrades = [];

        for ( let asset of assets ) {

            const forAsset = inventory.schema.getUpgradesForAsset ( asset );
            if ( forAsset ) {
                upgrades.push ({
                    asset:      asset,
                    assetID:    asset.assetID,
                    selected:   forAsset [ forAsset.length - 1 ],
                    options:    forAsset,
                });
                assetsWithUpgrades.push ( asset.assetID );
            }
        }

        upgrades.sort (( a, b ) => {
            const nameA = inventory.schema.getFriendlyNameForAsset ( a.asset );
            const nameB = inventory.schema.getFriendlyNameForAsset ( b.asset );
            return ( nameA.localeCompare ( nameB ));
        });

        for ( let i in upgrades ) {
            upgrades [ i ].upgradeID = i; 
        }

        this.upgrades = upgrades;
        this.assetsWithUpgrades = assetsWithUpgrades;
        this.validate ();
    }

    //----------------------------------------------------------------//
    @action
    select ( upgradeID, option ) {

        this.upgrades [ upgradeID ].selected = option;
        this.validate ();
    }

    //----------------------------------------------------------------//
    @action
    toggle ( upgradeID ) {

        const upgrade = this.upgrades [ upgradeID ];
        const max = upgrade.options [ upgrade.options.length - 1 ];

        upgrade.selected = ( upgrade.asset.type === upgrade.selected ) ? max : upgrade.asset.type;

        this.validate ();
    }

    //----------------------------------------------------------------//
    @computed get
    total () {

        return this.upgradesWithFilter.length;
    }

    //----------------------------------------------------------------//
    @computed get
    totalEnabled () {

        if ( !this.upgrades ) return 0;
        
        let enabled = 0;
        for ( let upgrade of this.upgradesWithFilter ) {
            if ( upgrade.asset.type !== upgrade.selected ) {
                ++enabled;
            }
        }
        return enabled;
    }

    //----------------------------------------------------------------//
    @computed get
    upgradeMap () {

        const map = {};
        for ( let upgrade of this.upgradesWithFilter ) {
            if ( upgrade.asset.type !== upgrade.selected ) {
                map [ upgrade.assetID ] = upgrade.selected;
            }
        }
        return map;
    }

    //----------------------------------------------------------------//
    @computed get
    upgradesWithFilter () {

        if ( this.filter ) {

            const upgrades = [];
            for ( let upgrade of this.upgrades ) {
                if ( this.filter ( upgrade.assetID )) {
                    upgrades.push ( upgrade );
                }
            }
            return upgrades;
        }
        return this.upgrades;
    }

    //----------------------------------------------------------------//
    virtual_checkComplete () {

        return ( this.totalEnabled > 0 );
    }

    //----------------------------------------------------------------//
    virtual_composeBody () {

        const body = this.formatBody ();
        body.upgrades = this.upgradeMap;
        return body;
    }

    //----------------------------------------------------------------//
    virtual_decorateTransaction ( transaction ) {

        transaction.setAssetsUtilized ( Object.keys ( this.upgradeMap ));
    }
}
