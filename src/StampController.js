// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { Inventory, INVENTORY_FILTER_STATUS, InventoryWithFilter, makeSquap } from 'cardmotron';
import _                                    from 'lodash';
import { action, computed, observable }     from 'mobx';

//const debugLog = function () {}
const debugLog = function ( ...args ) { console.log ( '@STAMP:', ...args ); }

//================================================================//
// StampController
//================================================================//
export class StampController {

    @observable stamp               = false;
    @observable asset               = false;

    @computed get assetID           () { return this.asset.assetID; }
    @computed get owner             () { return this.asset.owner; }
    @computed get price             () { return this.stamp.price; }
    @computed get schema            () { return this.inventoryService.schema; }

    //----------------------------------------------------------------//
    constructor ( accountService, stamp, asset ) {

        this.accountService     = accountService;
        this.networkService     = accountService.networkService;
        this.inventoryService   = accountService.inventoryService;

        this.setStamp ( stamp, asset );
    }

    //----------------------------------------------------------------//
    @computed get
    filteredInventory () {
        
        if ( !( this.schema && this.stamp )) return false;
        
        let qualifier = false;
        if ( this.stamp.qualifier ) {
            qualifier = makeSquap ( this.stamp.qualifier );
        }
        
        const availableAssets = {};
        
        for ( let assetID in this.inventoryService.assets ) {
            const asset = this.inventoryService.assets [ assetID ];

            if ( !qualifier || qualifier.eval ({[ '' ]: asset })) {
                availableAssets [ assetID ] = true;
            }
        }

        return new InventoryWithFilter ( this.inventoryService, ( assetID ) => {
            return availableAssets [ assetID ] || false;
        });
    }

    //----------------------------------------------------------------//
    @computed get
    isFavorite () {
        return this.networkService.isFavoriteStamp ( this.assetID );
    }

    //----------------------------------------------------------------//
    @action
    setStamp ( stamp, asset ) {

        this.stamp = stamp || false;
        this.asset = asset || false;
    }

    //----------------------------------------------------------------//
    @computed get
    stampInventory () {
        
        if ( !( this.schema && this.stamp )) return false;
        
        const stampInventory = new Inventory ();
        stampInventory.setSchema ( this.inventoryService.schema );
        stampInventory.setAsset ( this.asset );
        return stampInventory;
    }
}
