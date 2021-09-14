// Copyright (c) 2019 Cryptogogue, Inc. All Rights Reserved.

import * as AppDB                       from './AppDB';
import { Schema, verifyImagesAsync }    from 'cardmotron';
import { ProgressController, RevocableContext } from 'fgc';
import { action, computed, observable, runInAction } from 'mobx';
import _                                from 'lodash';

import InventoryWorker                  from './InventoryWorker.worker';

const MAX_ASSET_SVG_CACHE_SIZE = 32;

//const debugLog = function () {}
const debugLog = function ( ...args ) { console.log ( '@INVENTORY:', ...args ); }

//================================================================//
// InventoryService
//================================================================//
export class InventoryService {

    @observable.shallow assets  = {};
    @observable inbox           = [];
    @observable version         = false;
    @observable isLoaded        = false;
    @observable.ref schema      = false;

    @computed get accountID     () { return this.accountService.accountID; }
    @computed get accountIndex  () { return this.accountService.index; }
    @computed get networkID     () { return this.accountService.networkService.networkID; }
    @computed get nonce         () { return this.version.nonce; }

    //----------------------------------------------------------------//
    async applyDeltaAsync () {

        if ( !this.delta ) return false;

        debugLog ( 'APPLY DELTA' );

        const delta = this.delta;

        for ( let assetID of delta.deletions ) {
            
            if ( delta.additions.includes ( assetID )) continue; // skip if removed then re-added
            debugLog ( 'DELETING ASSET', assetID );
            await AppDB.deleteWhereAsync ( 'assets', { networkID: this.networkID, accountIndex: this.accountIndex, assetID: assetID });

            runInAction (() => {
                delete this.assets [ assetID ];
                this.inventory.deleteAsset ( assetID );
            });
        }

        const assets =_.cloneDeep ( delta.assets );
        const inbox = [];

        for ( let asset of assets ) {

            const prevAsset = this.assets [ asset.assetID ] || false;
            if ( prevAsset && ( prevAsset.inventoryNonce === asset.inventoryNonce )) continue;

            debugLog ( 'ADDING ASSET', asset.assetID );

            let svg = false;

            if (( prevAsset === false ) || !_.isEqual ( prevAsset.fields, asset.fields )) {

                const assetAndSVG = await this.expandAssetAsync ( asset );

                asset = assetAndSVG.asset;
                svg = assetAndSVG.svg;
            }

            await AppDB.putAssetAsync ( this.networkID, this.accountIndex, asset, svg );

            assets [ asset.assetID ] = asset;

            if ( svg ) {
                inbox.push ( asset.assetID );

                if ( _.has ( this.assetSVGCache, asset.assetID )) {
                    this.assetSVGCache [ asset.assetID ] = svg;
                }
            }
        }

        runInAction (() => {

            for ( let asset of assets ) {
                this.assets [ asset.assetID ] = asset;
                this.inventory.setAsset ( asset );
            }

            for ( let assetID of inbox ) {
                if ( !this.inbox.includes ( assetID )) {
                    this.inbox.push ( assetID );
                }
            }
        });

        runInAction (() => {
            this.version.nonce          = delta.nextNonce;
            this.version.timestamp      = delta.timestamp;
        });

        await AppDB.putAsync ( 'accounts', _.cloneDeep ( this.version ));
        await AppDB.deleteWhereAsync ( 'inventoryDelta', { networkID: this.networkID, accountIndex: this.accountIndex });

        this.delta = false;

        return true;
    }

    //----------------------------------------------------------------//
    @action
    async clearInbox () {
        this.inbox = [];
        await AppDB.deleteWhereAsync ( 'inbox', { networkID: this.networkID, accountIndex: this.accountIndex });
    }

    //----------------------------------------------------------------//
    constructor ( accountService, inventoryController, progressController ) {

        this.revocable = new RevocableContext ();

        this.progress           = progressController || new ProgressController ();
        this.appState           = accountService.appState;
        this.accountService     = accountService;
        this.networkService     = accountService.networkService;
        this.inventory          = inventoryController;

        runInAction (() => {
            this.version = {
                networkID:      this.networkID,
                accountIndex:   this.accountIndex,
                nonce:          0,
                timestamp:      false,
            }
        });

        this.worker = new InventoryWorker ();

        this.assetSVGCache          = {};
        this.assetSVGCacheQueue     = [];
    }

    //----------------------------------------------------------------//
    async expandAssetAsync ( asset ) {

        return new Promise (( resolve, reject ) => {
            
            const handler = async ( event ) => {
                this.worker.removeEventListener ( 'message', handler );
                console.log ( 'WORKER finished expandAssetAsync' );
                resolve ( event.data );
            }
            this.worker.addEventListener ( 'message', handler );
            this.worker.postMessage ({ asset: asset });
        });
    }

    //----------------------------------------------------------------//
    finalize () {

        this.revocable.finalize ();
        this.worker.terminate ();
    }

    //----------------------------------------------------------------//
    formatSchemaKey ( schemaHash, version ) {

        return `${ version.release } - ${ version.major }.${ version.minor }.${ version.revision } (${ schemaHash })`;
    }

    //----------------------------------------------------------------//
    async getAssetSVGAsync ( assetID ) {

        if ( _.has ( this.assetSVGCache, assetID )) return this.assetSVGCache [ assetID ];

        const row   = await AppDB.getAsync ( 'assetSVGs', { networkID: this.networkID, accountIndex: this.accountIndex, assetID: assetID });
        let svg     = row && row.svg || false;

        if ( svg ) {

            svg = await verifyImagesAsync ( svg );

            if (( this.assetSVGCacheQueue.length + 1 ) > MAX_ASSET_SVG_CACHE_SIZE ) {
                const removeID = this.assetSVGCacheQueue.shift ();
                delete this.assetSVGCacheQueue [ removeID ];
            }
            this.assetSVGCache [ assetID ] = svg;
            this.assetSVGCacheQueue.push ( assetID );
        }
        return svg;
    }

    //----------------------------------------------------------------//
    @computed
    get inboxSize () {

        return this.inbox.length;
    }

    //----------------------------------------------------------------//
    isNew ( assetID ) {

        return this.inbox.includes ( assetID );
    }

    //----------------------------------------------------------------//
    async loadAssetsAsync () {

        debugLog ( 'LOADING ASSETS' );

        let assets  = {};
        let inbox   = [];
        
        const assetRows = await AppDB.queryAsync ( 'assets', { networkID: this.networkID, accountIndex: this.accountIndex });
        
        for ( let row of assetRows ) {
            assets [ row.assetID ] = row.asset;
        }

        const inboxRows = await AppDB.queryAsync ( 'inbox', { networkID: this.networkID, accountIndex: this.accountIndex });

        for ( let row of inboxRows ) {
            inbox.push ( row.assetID );
        }

        runInAction (() => {
            this.assets = assets;
            this.inbox = inbox;
        });

        this.inventory.setAssets ( assets );

        const deltaRow = await AppDB.getAsync ( 'inventoryDelta', { networkID: this.networkID, accountIndex: this.accountIndex });
        if ( deltaRow && deltaRow.delta ) {
            this.delta = deltaRow.delta;
        }
    }

    //----------------------------------------------------------------//
    async loadAsync () {

        if ( this.isLoaded ) return;

        this.progress.setLoading ( true );

        await this.progress.onProgress ( 'Loading Inventory' );

        const version = await AppDB.getAsync ( 'accounts', { networkID: this.networkID, accountIndex: this.accountIndex });
        if ( version ) {

            debugLog ( 'LOADING SCHEMA AND INVENTORY FROM DB' );

            const schemaRecord = await AppDB.getAsync ( 'schemas', { networkID: this.networkID });
            if ( schemaRecord ) {

                debugLog ( 'HAS SCHEMA RECORD' );

                await this.makeSchema ( schemaRecord.schema );
                if ( this.schema ) {

                    debugLog ( 'HAS CACHED SCHEMA' );

                    await this.loadAssetsAsync ();
                    if ( Object.keys ( this.assets ).length > 0 ) {
                        debugLog ( 'LOADED CACHED ASSETS' );
                    }
                }
            }

            runInAction (() => { this.version = version; });
        }

        runInAction (() => { this.isLoaded = true; });
        this.progress.setLoading ( false );
    }

    //----------------------------------------------------------------//
    async makeSchema ( schemaObj ) {

        const schema = new Schema ( schemaObj );
        await schema.affirmFontsAsync ();

        runInAction (() => {
            this.schema = schema;
        });
        this.inventory.setSchema ( schema );

        return new Promise (( resolve, reject ) => {
            
            const handler = async ( event ) => {
                this.worker.removeEventListener ( 'message', handler );
                console.log ( 'WORKER finished makeSchema', event );
                resolve ();
            }
            this.worker.addEventListener ( 'message', handler );
            this.worker.postMessage ({ schemaObj: schemaObj });
        });
    }

    //----------------------------------------------------------------//
    @computed
    get newAssets () {

        const newAssets = {};

        for ( let assetID of this.inbox ) {
            newAssets [ assetID ] = this.assets [ assetID ];
        }
        return newAssets;
    }

    //----------------------------------------------------------------//
    @action
    async reset () {

        debugLog ( 'RESET' );

        this.version.nonce          = 0;
        this.version.timestamp      = false;

        if ( Object.keys ( this.assets ).length > 0 ) {
            this.assets = {};
            this.inbox = [];
            this.inventory.setAssets ({});
            await AppDB.deleteWhereAsync ( 'assets', { networkID: this.networkID, accountIndex: this.accountIndex });
            await AppDB.deleteWhereAsync ( 'inbox', { networkID: this.networkID, accountIndex: this.accountIndex });
        }

        debugLog ( 'PUTTING VERSION:', JSON.stringify ( this.version, null, 4 ));

        await AppDB.putAsync ( 'accounts', _.cloneDeep ( this.version ));
    }

    //----------------------------------------------------------------//
    async serviceStep () {

        if ( !this.isLoaded ) return;
        if ( this.delta ) return;

        try {
            await this.updateAsync ();
        }
        catch ( error ) {
            debugLog ( error );
        }
    }

    //----------------------------------------------------------------//
    async updateAsync () {

        debugLog ( 'UPDATE INVENTORY' );

        const data = await this.revocable.fetchJSON ( this.networkService.getServiceURL ( `/accounts/${ this.accountID }/inventory` ));

        debugLog ( 'STATUS FROM SERVER:', data );

        if ( data.inventoryTimestamp ) {

            await this.updateSchema ( data.schemaHash, data.schemaVersion );
            if ( this.schema ) {
                await this.updateDeltaAsync ( data.inventoryNonce, data.inventoryTimestamp );
            }
        }
        else {
            await this.reset ();
        }

    }

    //----------------------------------------------------------------//
    async updateDeltaAsync ( nextNonce, timestamp ) {

        debugLog ( 'UPDATE INVENTORY (DELTA)' );

        let currentNonce = this.version.nonce;

        debugLog ( 'CURRENT NONCE:', currentNonce );
        debugLog ( 'NEXT NONCE:', nextNonce );
        debugLog ( 'TIMESTAMP:', timestamp );

        if ( nextNonce === currentNonce ) return;
        if (( timestamp !== this.version.timestamp ) || ( nextNonce < currentNonce )) {
            debugLog ( 'TIMESTAMP MISMATCH OR NONCE ROLLBACK; RESETTING' );
            await this.reset ();
            currentNonce = 0;
        }

        const count         = nextNonce - currentNonce;
        const serviceURL    = this.networkService.getServiceURL ( `/accounts/${ this.accountID }/inventory/log/${ currentNonce }`, { count: count });
        const data          = await this.revocable.fetchJSON ( serviceURL );

        if ( data.nextNonce <= currentNonce ) return;

        data.timestamp = timestamp; // store it here for later

        await AppDB.putAsync ( 'inventoryDelta', { networkID: this.networkID, accountIndex: this.accountIndex, delta: data });
        this.delta = data;
    }

    //----------------------------------------------------------------//
    async updateSchema ( schemaHash, schemaVersion ) {

        const schema        = false;

        if ( !( schemaHash && schemaVersion )) return;
        let schemaKey = this.formatSchemaKey ( schemaHash, schemaVersion );

        if ( this.schema ) {
            const networkRecord = await AppDB.getAsync ( 'networks', this.networkID );
            if ( networkRecord && ( networkRecord.schemaKey === schemaKey )) return;
        }

        await AppDB.deleteWhereAsync ( 'schemas', { networkID: this.networkID });

        const schemaInfo = await this.revocable.fetchJSON ( this.networkService.getServiceURL ( '/schema' ));

        schemaKey = this.formatSchemaKey ( schemaInfo.schemaHash, schemaInfo.schema.version );
        await AppDB.putAsync ( 'schemas', { networkID: this.networkID, key: schemaKey, schema: schemaInfo.schema });
        await AppDB.putAsync ( 'networks', { networkID: this.networkID, schemaKey: schemaKey });

        await this.makeSchema ( schemaInfo.schema );
    }
}
