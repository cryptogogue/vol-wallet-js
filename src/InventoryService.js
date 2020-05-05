// Copyright (c) 2019 Cryptogogue, Inc. All Rights Reserved.

import { assert, ProgressController, RevocableContext, util } from 'fgc';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import _                            from 'lodash';

//================================================================//
// InventoryService
//================================================================//
export class InventoryService {

    //----------------------------------------------------------------//
    constructor ( appState, inventoryController, progressController ) {

        this.revocable = new RevocableContext ();

        this.progress = progressController || new ProgressController ();
        this.inventory = inventoryController;

        if ( appState.hasAccountInfo ) {
            this.fetchInventory ( appState.network.nodeURL, appState.accountID );
        }
    }

    //----------------------------------------------------------------//
    finalize () {

        this.revocable.finalize ();
    }

    //----------------------------------------------------------------//
    async fetchInventory ( nodeURL, accountID ) {

        try {
            console.log ( 'FETCH INVENTORY', nodeURL, accountID );

            this.progress.setLoading ( true );

            this.progress.onProgress ( 'Fetching Schema' );
            const schemaJSON        = await this.revocable.fetchJSON ( nodeURL + '/schema' );
            console.log ( schemaJSON );

            this.progress.onProgress ( 'Fetching Inventory' );
            const inventoryJSON     = await this.revocable.fetchJSON ( nodeURL + '/accounts/' + accountID + '/inventory' );
            console.log ( inventoryJSON );

            let assets = {};
            for ( let asset of inventoryJSON.inventory ) {
                assets [ asset.assetID ] = asset;
            }
            await this.inventory.update ( schemaJSON.schema, assets );
        }
        catch ( error ) {
            console.log ( error );
        }
        console.log ( 'DONE LOADING' );
        this.progress.setLoading ( false );
    }
}
