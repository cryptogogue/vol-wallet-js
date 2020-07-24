// Copyright (c) 2019 Cryptogogue, Inc. All Rights Reserved.

import { Schema }                   from 'cardmotron';
import { assert, ProgressController, RevocableContext, util } from 'fgc';
import { action, computed, extendObservable, observable, observe, reaction, runInAction } from 'mobx';
import Dexie                        from 'dexie';
import _                            from 'lodash';

const debugLog = function () {}
// const debugLog = console.log;

//================================================================//
// InventoryService
//================================================================//
export class InventoryService {

    @observable assets          = {};
    @observable version         = false;

    //----------------------------------------------------------------//
    @computed
    get accountID () {

        return this.appState.accountID;
    }

    //----------------------------------------------------------------//
    constructor ( appState, inventoryController, progressController ) {

        this.db = new Dexie ( 'volwal' ); 
        this.db.version ( 1 ).stores ({
            networks:   'networkID',
            schemas:    '[networkID+key], networkID',
            accounts:   '[networkID+accountID]',
            assets:     '[networkID+accountID]',
        });
        this.db.open ();

        this.revocable  = new RevocableContext ();

        this.progress   = progressController || new ProgressController ();
        this.appState   = appState;
        this.inventory  = inventoryController;

        // this.serviceLoop ();
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

        debugLog ( 'INVENTORY: LOADING ASSETS' );

        let assets = {};
        
        const record = await this.db.assets.get ({ networkID: this.networkID, accountID: this.accountID });
        
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
    async loadOrReload () {

        const version = await this.db.accounts.get ({ networkID: this.networkID, accountID: this.accountID });
        if ( !version ) return;

        if (( this.version.timestamp === version.timestamp ) && ( this.version.nonce === version.nonce )) return;

        debugLog ( 'LOADING SCHEMA AND INVENTORY FROM DB' );

        this.progress.setLoading ( true );

        const schemaRecord = await this.db.schemas.get ({ networkID: this.networkID });
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

        runInAction (() => {
            this.version = version; // don't reload until next version
        });
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
    get networkID () {

        return this.appState.networkID;
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
    @computed
    get nodeURL () {

        return this.appState.network.nodeURL;
    }

    //----------------------------------------------------------------//
    @action
    async reset () {

        debugLog ( 'INVENTORY: RESET' );

        if ( Object.keys ( this.assets ).length > 0 ) {
            this.assets = {};
            this.inventory.setAssets ({});
            await this.db.assets.where ({ networkID: this.networkID, accountID: this.accountID }).delete ();
        }
    }

    //----------------------------------------------------------------//
    async serviceStep () {

        try {
            await this.loadOrReload ();
            await this.update ();
        }
        catch ( error ) {
            console.log ( error );
        }
    }

    //----------------------------------------------------------------//
    async update () {

        debugLog ( 'INVENTORY: UPDATE' );

        this.progress.setLoading ( true );

        await this.progress.onProgress ( 'Updating Inventory' );

        const data          = await this.revocable.fetchJSON ( `${ this.nodeURL }/accounts/${ this.accountID }/inventory` );

        const nonce         = data.inventoryNonce;
        const timestamp     = data.inventoryTimestamp;

        if ( timestamp ) {

            await this.updateSchema ( data.schemaHash, data.schemaVersion );
            if ( !this.schema ) return;

            await this.progress.onProgress ( 'Updating Inventory' );
            
            const version = this.version;

            if ( version && ( timestamp === version.timestamp )) {
                if ( version.nonce < nonce ) {
                    await this.updateDelta ( version.nonce, nonce );
                }
                else if ( nonce < version.nonce ) {
                    await this.reset ();
                }
            }
            else {
                this.appState.setAccountInventoryNonce ( 0 );
                this.updateAll ();
            }

            const nextVersion = { networkID: this.networkID, accountID: this.accountID, nonce: nonce, timestamp: timestamp };
            runInAction (() => { this.version = nextVersion; });
            await this.db.accounts.put ( nextVersion );
        }
        else {
            await this.reset ();
        }

        this.progress.setLoading ( false );
    }

    //----------------------------------------------------------------//
    async updateAll () {

        await this.reset ();

        debugLog ( 'INVENTORY: UPDATE ALL' );

        await this.progress.onProgress ( 'Fetching Inventory' );

        const inventoryJSON = await this.revocable.fetchJSON ( this.nodeURL + '/accounts/' + this.accountID + '/inventory/assets' );

        const assets = {};
        for ( let asset of inventoryJSON.inventory ) {
            assets [ asset.assetID ] = asset;
        }

        await this.db.assets.put ({ networkID: this.networkID, accountID: this.accountID, assets: JSON.stringify ( assets )});

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

        const count = nextNonce - currentNonce;
        const url = `${ this.nodeURL }/accounts/${ this.accountID }/inventory/log/${ currentNonce }?count=${ count }`;
        const data = await this.revocable.fetchJSON ( url );

        const assetsSent = _.clone ( this.appState.account.assetsSent || {});

        runInAction (() => {

            for ( let asset of data.assets ) {
                delete assetsSent [ asset.assetID ];
                debugLog ( 'INVENTORY: ADDING ASSET', asset.assetID );
                this.assets [ asset.assetID ] = asset;
                this.inventory.setAsset ( asset );
            }

            for ( let assetID of data.deletions ) {
                delete assetsSent [ assetID ];
                if ( data.additions.includes ( assetID )) continue;
                debugLog ( 'INVENTORY: DELETING ASSET', assetID );
                delete this.assets [ assetID ];
                this.inventory.deleteAsset ( assetID );
            }

            this.appState.account.assetsSent = assetsSent;
        });

        await this.db.assets.put ({ networkID: this.networkID, accountID: this.accountID, assets: JSON.stringify ( this.assets )});

        this.inventory.setAssets ( this.assets );
    }

    //----------------------------------------------------------------//
    async updateSchema ( schemaHash, schemaVersion ) {

        const schema        = false;

        if ( !( schemaHash && schemaVersion )) return;
        let schemaKey = this.formatSchemaKey ( schemaHash, schemaVersion );

        await this.progress.onProgress ( 'Fetching Schema' );

        if ( this.schema ) {
            const networkRecord = await this.db.networks.get ( this.networkID );
            if ( networkRecord && ( networkRecord.schemaKey === schemaKey )) return;
        }

        await this.db.schemas.where ({ networkID: this.networkID }).delete ();

        const schemaInfo = ( await this.revocable.fetchJSON ( this.nodeURL + '/schema' ));

        schemaKey = this.formatSchemaKey ( schemaInfo.schemaHash, schemaInfo.schema.version );
        await this.db.schemas.put ({ networkID: this.networkID, key: schemaKey, json: JSON.stringify ( schemaInfo.schema )});
        await this.db.networks.put ({ networkID: this.networkID, schemaKey: schemaKey });

        await this.makeSchema ( schemaInfo.schema );
    }
}
