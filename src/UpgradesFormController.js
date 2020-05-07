// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { Transaction, TRANSACTION_TYPE }    from './Transaction';
import { TransactionFormController }        from './TransactionFormController';
import { FIELD_CLASS }                      from './TransactionFormFieldControllers';
import { assert, randomBytes, util }        from 'fgc';
import _                                    from 'lodash';
import { action, computed, extendObservable, observable, observe, reaction, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';

//================================================================//
// UpgradesFormController
//================================================================//
export class UpgradesFormController extends TransactionFormController {

    @observable upgrades = [];
    @observable assetsWithUpgrades = [];

    //----------------------------------------------------------------//
    constructor ( appState, inventory ) {
        super ();

        this.inventory = inventory;
        this.initialize ( appState, TRANSACTION_TYPE.UPGRADE_ASSETS );

        this.cancelBindingReaction = reaction (
            () => {
                return {
                    assets: inventory.availableAssetsArray,
                    assetsUtilized: appState.assetsUtilized,
                };
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

        this.cancelBindingReaction ();
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

        const assetsUtilized = appState ? appState.assetsUtilized : [];

        this.inventory = inventory;

        const assets = inventory.availableAssetsArray;
        if ( !assets.length ) return;

        const upgrades = [];
        const assetsWithUpgrades = [];

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
