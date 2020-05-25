// Copyright (c) 2019 Cryptogogue, Inc. All Rights Reserved.

import { assert, ProgressController, RevocableContext, util } from 'fgc';
import { action, computed, extendObservable, observable, observe, reaction, runInAction } from 'mobx';
import Dexie                        from 'dexie';
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

        this.cancelAccountInfoReaction = reaction (
            () => {
                return {
                    hasAccountInfo:     appState.hasAccountInfo,
                    transactionNonce:   appState.nonce || 0,
                    inventoryNonce:     appState.inventoryNonce,
                };
            },
            ({ hasAccountInfo, inventoryNonce }) => {

                if ( appState.hasAccountInfo ) {
                    this.fetchInventory (
                        appState.network.nodeURL,
                        appState.accountID,
                        inventoryNonce
                    );
                }
            }
        );
    }

    //----------------------------------------------------------------//
    finalize () {

        this.revocable.finalize ();
        this.cancelAccountInfoReaction ();
    }

    //----------------------------------------------------------------//
    async fetchInventory ( nodeURL, accountID, inventoryNonce ) {

        try {
            this.progress.setLoading ( true );

            this.progress.onProgress ( 'Fetching Schema' );
            const schemaJSON        = await this.revocable.fetchJSON ( nodeURL + '/schema' );

            this.progress.onProgress ( 'Fetching Inventory' );
            const inventoryJSON     = await this.revocable.fetchJSON ( nodeURL + '/accounts/' + accountID + '/inventory' );

            let assets = {};
            for ( let asset of inventoryJSON.inventory ) {
                if ( asset.inventoryNonce < inventoryNonce ) {
                    assets [ asset.assetID ] = asset;
                }
            }
            await this.inventory.update ( schemaJSON.schema, assets );
        }
        catch ( error ) {
            console.log ( error );
        }
        this.progress.setLoading ( false );
    }
}
