// Copyright (c) 2019 Cryptogogue, Inc. All Rights Reserved.

import { Schema }                   from 'cardmotron';
import { assert, ProgressController, RevocableContext, util } from 'fgc';
import { action, computed, extendObservable, observable, observe, reaction, runInAction } from 'mobx';
import Dexie                        from 'dexie';
import _                            from 'lodash';

//================================================================//
// InventoryService
//================================================================//
export class InventoryService {

    @observable assets = {};

    //----------------------------------------------------------------//
    constructor ( appState, inventoryController, progressController ) {

        this.db = new Dexie ( 'volwal' ); 
        this.db.version ( 1 ).stores ({
            networks:   'networkID',
            schemas:    '[networkID+key], networkID',
            accounts:   'accountID',
            assets:     'accountID',
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
                    inventoryNonce:     appState.inventoryNonce,
                };
            },
            ({ networkID, hasAccountInfo, inventoryNonce }) => {

                if ( appState.hasAccountInfo ) {
                    try {
                        this.update ();
                    }
                    catch ( error ) {
                        console.log ( error );
                    }
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
    async loadAssets () {

        if ( this.assets ) return;

        const record = await this.db.assets.get ( this.appState.accountID );
        if ( record ) {
            runInAction (() => {
                this.assets = JSON.parse ( record.assets );
            });
        }
    }

    //----------------------------------------------------------------//
    async makeSchema ( json ) {

        const schema = new Schema ( json );
        await schema.fetchFontsAsync ( json.fonts || {});
        runInAction (() => {
            this.schema = schema;
        });
    }

    //----------------------------------------------------------------//
    async update () {

        this.progress.setLoading ( true );

        await this.progress.onProgress ( 'Updating Inventory' );

        const accountID     = this.appState.accountID;
        const nodeURL       = this.appState.network.nodeURL;

        const data          = await this.revocable.fetchJSON ( `${ nodeURL }/accounts/${ accountID }/inventory` );

        const nonce         = data.inventoryNonce;
        const timestamp     = data.inventoryTimestamp;

        if ( timestamp ) {

            await this.updateSchema ( data.schemaHash, data.schemaVersion );
            if ( !this.schema ) return;

            await this.progress.onProgress ( 'Loading Assets' );
            await this.loadAssets ();
            await this.progress.onProgress ( 'Updating Inventory' );

            const record = await this.db.accounts.get ( accountID );

            if ( record && ( timestamp === record.timestamp ) && ( record.nonce < nonce )) {
                await this.updateDelta ( record.nonce );
            }
            else {
                this.updateAll ();
            }

            await this.db.accounts.put ({ accountID: accountID, nonce: nonce, timestamp: timestamp });
        }
        this.progress.setLoading ( false );
    }

    //----------------------------------------------------------------//
    async updateAll () {

        await this.progress.onProgress ( 'Fetching Inventory' );

        const accountID = this.appState.accountID;
        const nodeURL = this.appState.network.nodeURL;

        const inventoryJSON = await this.revocable.fetchJSON ( nodeURL + '/accounts/' + accountID + '/inventory/assets' );

        const assets = {};
        for ( let asset of inventoryJSON.inventory ) {
            assets [ asset.assetID ] = asset;
        }

        await this.db.assets.put ({ accountID: accountID, assets: JSON.stringify ( assets )});

        runInAction (() => {
            this.assets = assets;
        });

        this.inventory.setSchema ( this.schema );
        this.inventory.setAssets ( this.assets );
    }

    //----------------------------------------------------------------//
    async updateDelta ( nonce ) {

        await this.updateAll ();
    }

    //----------------------------------------------------------------//
    async updateSchema ( schemaHash, schemaVersion ) {

        const networkID     = this.appState.networkID;
        const nodeURL       = this.appState.network.nodeURL;
        const schema        = false;

        if ( !( schemaHash && schemaVersion )) return;
        let schemaKey = this.formatSchemaKey ( schemaHash, schemaVersion );

        await this.progress.onProgress ( 'Fetching Schema' );

        const networkRecord = await this.db.networks.get ( networkID );

        if ( networkRecord && ( networkRecord.schemaKey === schemaKey )) {

            if ( !this.schema ) {
                const schemaRecord = await this.db.schemas.get ({ networkID: networkID, key: schemaKey });
                if ( schemaRecord ) {
                    await this.makeSchema ( JSON.parse ( schemaRecord.json ));
                }
            }
            if ( this.schema ) return;
        }

        await this.db.schemas.where ({ networkID: networkID }).delete ();

        const schemaInfo = ( await this.revocable.fetchJSON ( nodeURL + '/schema' ));

        schemaKey = this.formatSchemaKey ( schemaInfo.schemaHash, schemaInfo.schema.version );
        await this.db.schemas.put ({ networkID: networkID, key: schemaKey, json: JSON.stringify ( schemaInfo.schema )});
        await this.db.networks.put ({ networkID: networkID, schemaKey: schemaKey });

        await this.makeSchema ( schemaInfo.schema );
    }
}
