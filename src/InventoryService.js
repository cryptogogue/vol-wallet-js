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

        this.db = new Dexie ( 'volwal' ); 
        this.db.version ( 1 ).stores ({
            schemas: '[networkID+key], networkID',
        });
        this.db.open ();

        this.revocable  = new RevocableContext ();

        this.progress   = progressController || new ProgressController ();
        this.appState   = appState;
        this.inventory  = inventoryController;

        this.cancelAccountInfoReaction = reaction (
            () => {
                return {
                    networkID:          appState.networkID,
                    hasAccountInfo:     appState.hasAccountInfo,
                    transactionNonce:   appState.nonce || 0,
                    inventoryNonce:     appState.inventoryNonce,
                };
            },
            ({ networkID, hasAccountInfo, inventoryNonce }) => {

                if ( appState.hasAccountInfo ) {
                    this.fetchInventory (
                        networkID,
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
    formatSchemaKey ( schemaHash, version ) {
        return `${ version.release } - ${ version.major }.${ version.minor }.${ version.revision } (${ schemaHash })`;
    }

    //----------------------------------------------------------------//
    async fetchInventory ( networkID, nodeURL, accountID, inventoryNonce ) {

        try {

            this.progress.setLoading ( true );

            await this.progress.onProgress ( 'Fetching Inventory' );
            const inventoryJSON = await this.revocable.fetchJSON ( nodeURL + '/accounts/' + accountID + '/inventory' );

            await this.progress.onProgress ( 'Fetching Schema' );

            let schema = false;
            if ( inventoryJSON.schemaHash && inventoryJSON.schemaVersion ) {

                const schemaKey = this.formatSchemaKey ( inventoryJSON.schemaHash, inventoryJSON.schemaVersion );
                const schemaRecord = await this.db.schemas.get ({ networkID: networkID, key: schemaKey });
                if ( schemaRecord ) {
                    schema = JSON.parse ( schemaRecord.json );
                }
            }

            if ( !schema ) {

                await this.db.schemas.where ({ networkID: networkID }).delete (); // clear out all the old schemas (TODO: limit this to the current

                const schemaJSON = ( await this.revocable.fetchJSON ( nodeURL + '/schema' ));
                schema = schemaJSON.schema;

                const schemaKey = this.formatSchemaKey ( schemaJSON.schemaHash, schema.version );
                await this.db.schemas.put ({ networkID: networkID, key: schemaKey, json: JSON.stringify ( schema )});
            }

            let assets = {};
            for ( let asset of inventoryJSON.inventory ) {
                if ( asset.inventoryNonce < inventoryNonce ) {
                    assets [ asset.assetID ] = asset;
                }
            }
            await this.inventory.update ( schema, assets );
        }
        catch ( error ) {
            console.log ( error );
        }
        this.progress.setLoading ( false );
    }
}
