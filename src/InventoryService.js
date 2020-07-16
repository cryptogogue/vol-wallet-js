// Copyright (c) 2019 Cryptogogue, Inc. All Rights Reserved.

import { Schema }                   from 'cardmotron';
import { assert, ProgressController, RevocableContext, util } from 'fgc';
import { action, computed, extendObservable, observable, observe, reaction, runInAction } from 'mobx';
import Dexie                        from 'dexie';
import _                            from 'lodash';

const debugLog = function () {}

//================================================================//
// InventoryService
//================================================================//
export class InventoryService {

    @observable assets          = {};
    @observable isLoaded        = false;

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

        this.serviceLoop ();
    }

    //----------------------------------------------------------------//
    finalize () {

        this.revocable.finalize ();
    }

    //----------------------------------------------------------------//
    formatSchemaKey ( schemaHash, version ) {

        return `${ version.release } - ${ version.major }.${ version.minor }.${ version.revision } (${ schemaHash })`;
    }

    //----------------------------------------------------------------//
    @computed
    get inboxSize () {

        let count = 0;
        for ( let assetID in this.assets ) {
            if ( this.isNew ( assetID )) {
                count++;
            }
        }
        return count;
    }

    //----------------------------------------------------------------//
    isNew ( assetID ) {

        const asset = this.assets [ assetID ];
        return asset ? ( this.appState.inventoryNonce <= asset.inventoryNonce ) : false;
    }

    //----------------------------------------------------------------//
    async loadAssets () {

        if ( this.isLoaded ) return;

        debugLog ( 'INVENTORY: LOADING ASSETS' );

        let assets = {};
        
        const record = await this.db.assets.get ( this.appState.accountID );
        
        if ( record ) {
            debugLog ( 'INVENTORY: HAS CACHED ASSETS' );
            assets = JSON.parse ( record.assets );
        }

        runInAction (() => {
            this.assets = assets;
        });

        this.inventory.setAssets ( assets );
    }

    //----------------------------------------------------------------//
    async makeSchema ( json ) {

        const schema = new Schema ( json );
        await schema.fetchFontsAsync ( json.fonts || {});
        runInAction (() => {
            this.schema = schema;
        });
        this.inventory.setSchema ( schema );
    }

    //----------------------------------------------------------------//
    @computed
    get newAssets () {

        const newAssets = {};
        for ( let assetID in this.assets ) {
            if ( this.isNew ( assetID )) {
                newAssets [ assetID ] = this.assets [ assetID ];
            }
        }
        return newAssets;
    }

    //----------------------------------------------------------------//
    @action
    async reset () {

        debugLog ( 'INVENTORY: RESET' );

        if ( Object.keys ( this.assets ).length > 0 ) {
            this.assets = {};
            this.inventory.setAssets ({});
            await this.db.assets.where ({ accountID: this.appState.accountID }).delete ();
        }
    }

    //----------------------------------------------------------------//
    async serviceLoop () {

        this.progress.setLoading ( true );

        const schemaRecord = await this.db.schemas.get ({ networkID: this.appState.networkID });
        if ( schemaRecord ) {

            debugLog ( 'INVENTORY: HAS SCHEMA RECORD' );

            await this.makeSchema ( JSON.parse ( schemaRecord.json ));
            if ( this.schema ) {

                debugLog ( 'INVENTORY: HAS CACHED SCHEMA' );

                await this.loadAssets ();
                if ( Object.keys ( this.assets ).length > 0 ) {

                    debugLog ( 'INVENTORY: LOADED CACHED ASSETS' );

                    runInAction (() => {
                        this.isLoaded = true;
                    });
                }
            }
        }

        this.progress.setLoading ( false );

        const update = async () => {
            try {
                await this.update ();
            }
            catch ( error ) {
                console.log ( error );
                throw error;
            }
        }
        this.revocable.promiseWithBackoff ( async () => await update (), 5000, true );
    }

    //----------------------------------------------------------------//
    async update () {

        debugLog ( 'INVENTORY: UPDATE' );

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

            await this.progress.onProgress ( 'Updating Inventory' );
            
            const record = await this.db.accounts.get ( accountID );

            if ( record && ( timestamp === record.timestamp )) {
                if ( record.nonce < nonce ) {
                    await this.updateDelta ( record.nonce, nonce );
                }
                else if ( nonce < record.nonce ) {
                    await this.reset ();
                }
            }
            else {
                this.appState.setAccountInventoryNonce ( 0 );
                this.updateAll ();
            }
            await this.db.accounts.put ({ accountID: accountID, nonce: nonce, timestamp: timestamp });
        }
        else {
            await this.reset ();
        }

        this.progress.setLoading ( false );
    }

    //----------------------------------------------------------------//
    async updateAll () {

        await this.reset ();

        const accountID = this.appState.accountID;
        const nodeURL = this.appState.network.nodeURL;

        debugLog ( 'INVENTORY: UPDATE ALL' );

        await this.progress.onProgress ( 'Fetching Inventory' );

        const inventoryJSON = await this.revocable.fetchJSON ( nodeURL + '/accounts/' + accountID + '/inventory/assets' );

        const assets = {};
        for ( let asset of inventoryJSON.inventory ) {
            assets [ asset.assetID ] = asset;
        }

        await this.db.assets.put ({ accountID: accountID, assets: JSON.stringify ( assets )});

        runInAction (() => {
            this.assets = assets;
            this.appState.account.assetsSent = {};
        });

        this.inventory.setAssets ( this.assets );
    }

    //----------------------------------------------------------------//
    async updateDelta ( currentNonce, nextNonce ) {

        debugLog ( 'INVENTORY: UPDATE DELTA' );

        await this.progress.onProgress ( 'Fetching Inventory' );

        const accountID = this.appState.accountID;
        const nodeURL = this.appState.network.nodeURL;

        const count = nextNonce - currentNonce;
        const url = `${ nodeURL }/accounts/${ accountID }/inventory/log/${ currentNonce }?count=${ count }`;
        const data = await this.revocable.fetchJSON ( url );

        const assetsSent = _.clone ( this.appState.account.assetsSent || {});

        runInAction (() => {

            for ( let asset of data.assets ) {
                delete assetsSent [ asset.assetID ];
                console.log ( 'INVENTORY: ADDING ASSET', asset.assetID );
                this.assets [ asset.assetID ] = asset;
                this.inventory.setAsset ( asset );
            }

            for ( let assetID of data.deletions ) {
                delete assetsSent [ assetID ];
                if ( data.additions.includes ( assetID )) continue;
                console.log ( 'INVENTORY: DELETING ASSET', assetID );
                delete this.assets [ assetID ];
                this.inventory.deleteAsset ( assetID );
            }

            this.appState.account.assetsSent = assetsSent;
        });

        await this.db.assets.put ({ accountID: accountID, assets: JSON.stringify ( this.assets )});
        
        this.inventory.setAssets ( this.assets );
    }

    //----------------------------------------------------------------//
    async updateSchema ( schemaHash, schemaVersion ) {

        const networkID     = this.appState.networkID;
        const nodeURL       = this.appState.network.nodeURL;
        const schema        = false;

        if ( !( schemaHash && schemaVersion )) return;
        let schemaKey = this.formatSchemaKey ( schemaHash, schemaVersion );

        await this.progress.onProgress ( 'Fetching Schema' );

        if ( this.schema ) {
            const networkRecord = await this.db.networks.get ( networkID );
            if ( networkRecord && ( networkRecord.schemaKey === schemaKey )) return;
        }

        await this.db.schemas.where ({ networkID: networkID }).delete ();

        const schemaInfo = ( await this.revocable.fetchJSON ( nodeURL + '/schema' ));

        schemaKey = this.formatSchemaKey ( schemaInfo.schemaHash, schemaInfo.schema.version );
        await this.db.schemas.put ({ networkID: networkID, key: schemaKey, json: JSON.stringify ( schemaInfo.schema )});
        await this.db.networks.put ({ networkID: networkID, schemaKey: schemaKey });

        await this.makeSchema ( schemaInfo.schema );
    }
}
