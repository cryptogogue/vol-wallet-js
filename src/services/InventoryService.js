// Copyright (c) 2019 Cryptogogue, Inc. All Rights Reserved.

import { Schema }                   from 'cardmotron';
import { assert, ProgressController, RevocableContext, util } from 'fgc';
import { action, computed, extendObservable, observable, observe, reaction, runInAction } from 'mobx';
import Dexie                        from 'dexie';
import _                            from 'lodash';

import InventoryWorker              from './InventoryWorker.worker';

//const debugLog = function () {}
const debugLog = function ( ...args ) { console.log ( '@INVENTORY:', ...args ); }

//================================================================//
// InventoryService
//================================================================//
export class InventoryService {

    @observable assets          = {};
    @observable inbox           = [];
    @observable version         = false;
    @observable isLoaded        = false;
    @observable schema          = false;

    @computed get accountID     () { return this.accountService.accountID; }
    @computed get accountIndex  () { return this.accountService.index; }
    @computed get networkID     () { return this.accountService.networkService.networkID; }
    @computed get nonce         () { return this.version.nonce; }

    //----------------------------------------------------------------//
    @action
    async clearInbox () {
        this.inbox = [];
        await this.db.inbox.put ({ networkID: this.networkID, accountIndex: this.accountIndex, inbox: []});
    }

    //----------------------------------------------------------------//
    constructor ( accountService, inventoryController, progressController ) {

        this.revocable = new RevocableContext ();

        this.progress           = progressController || new ProgressController ();
        this.appState           = accountService.appState;
        this.accountService     = accountService;
        this.networkService     = accountService.networkService;
        this.inventory          = inventoryController;

        this.appDB              = this.appState.appDB;
        this.db                 = this.appDB.db;

        runInAction (() => {
            this.version = {
                networkID:      this.networkID,
                accountIndex:   this.accountIndex,
                nonce:          0,
                timestamp:      false,
            }
        });

        this.worker = new InventoryWorker ();
        this.loadAsync ();
    }

    //----------------------------------------------------------------//
    async expandAssetsAsync ( assets ) {

        return new Promise (( resolve, reject ) => {
            
            this.worker.addEventListener ( 'message', ( event ) => {
                console.log ( 'WORKER finished expandAssetsAsync' );
                resolve ( event.data );
            });
            this.worker.postMessage ({ assets: assets });
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
        
        const assetsRecord = await this.db.assets.get ({ networkID: this.networkID, accountIndex: this.accountIndex });
        
        if ( assetsRecord ) {
            debugLog ( 'HAS CACHED ASSETS' );
            assets = assetsRecord.assets;
        }

        const inboxRecord = await this.db.inbox.get ({ networkID: this.networkID, accountIndex: this.accountIndex });
        
        if ( inboxRecord ) {
            inbox = inboxRecord.inbox || [];
        }

        runInAction (() => {
            this.assets = assets;
            this.inbox = inbox;
        });

        this.inventory.setAssets ( assets );
    }

    //----------------------------------------------------------------//
    async loadAsync () {

        if ( this.isLoaded ) return;

        this.progress.setLoading ( true );

        await this.progress.onProgress ( 'Loading Inventory' );

        const version = await this.db.accounts.get ({ networkID: this.networkID, accountIndex: this.accountIndex });
        if ( version ) {

            debugLog ( 'LOADING SCHEMA AND INVENTORY FROM DB' );

            const schemaRecord = await this.db.schemas.get ({ networkID: this.networkID });
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
        // await schema.fetchFontsAsync ( schemaObj.fonts || {});
        runInAction (() => {
            this.schema = schema;
        });
        this.inventory.setSchema ( schema );

        return new Promise (( resolve, reject ) => {
            
            this.worker.addEventListener ( 'message', ( event ) => {
                console.log ( 'WORKER finished makeSchema', event );
                resolve ();
            });
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
            await this.db.assets.where ({ networkID: this.networkID, accountIndex: this.accountIndex }).delete (); // deleted the assets *and* the inbox
            await this.db.inbox.where ({ networkID: this.networkID, accountIndex: this.accountIndex }).delete (); // deleted the assets *and* the inbox
        }

        debugLog ( 'PUTTING VERSION:', JSON.stringify ( this.version, null, 4 ));

        await this.db.accounts.put ( _.cloneDeep ( this.version ));
    }

    //----------------------------------------------------------------//
    async serviceStep () {

        let more = false;

        try {
            more = this.isLoaded && await this.updateAsync ();
        }
        catch ( error ) {
            debugLog ( error );
        }
        return more;
    }

    //----------------------------------------------------------------//
    async updateAsync () {

        debugLog ( 'UPDATE INVENTORY' );

        let more = false;

        const data = await this.revocable.fetchJSON ( this.networkService.getServiceURL ( `/accounts/${ this.accountID }/inventory` ));

        debugLog ( 'STATUS FROM SERVER:', data );

        if ( data.inventoryTimestamp ) {

            await this.updateSchema ( data.schemaHash, data.schemaVersion );
            if ( this.schema ) {

                more = await this.updateDeltaAsync ( data.inventoryNonce, data.inventoryTimestamp );
            }
        }
        else {
            await this.reset ();
        }

        return more;
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

        if ( data.nextNonce <= currentNonce ) return false;

        const assetsFiltered = _.clone ( this.accountService.account.assetsFiltered || {});

        const assets = await this.expandAssetsAsync ( data.assets );

        runInAction (() => {

            for ( let asset of assets ) {
                delete assetsFiltered [ asset.assetID ]; // just in case
                debugLog ( 'ADDING ASSET', asset.assetID );

                if ( !this.inbox.includes ( asset.assetID )) {

                    const prevAsset = this.assets [ asset.assetID ];

                    if ( !( prevAsset && ( prevAsset.inventoryNonce === asset.inventoryNonce ))) {
                        this.inbox.push ( asset.assetID );
                    }
                }

                // update or overwrite with the latest version
                this.assets [ asset.assetID ] = asset;
                this.inventory.setAsset ( asset );
            }

            for ( let assetID of data.deletions ) {
                delete assetsFiltered [ assetID ];
                if ( data.additions.includes ( assetID )) continue; // skip if removed then re-added
                debugLog ( 'DELETING ASSET', assetID );
                delete this.assets [ assetID ];
                this.inventory.deleteAsset ( assetID );
            }

            this.accountService.account.assetsFiltered = assetsFiltered;
        });

        // update the inventory db with the latest set of assets
        await this.db.assets.put ({ networkID: this.networkID, accountIndex: this.accountIndex, assets: _.cloneDeep ( this.assets )});
        await this.db.inbox.put ({ networkID: this.networkID, accountIndex: this.accountIndex, inbox: _.cloneDeep ( this.inbox )});

        this.inventory.setAssets ( this.assets );

        runInAction (() => {
            this.version.nonce          = data.nextNonce;
            this.version.timestamp      = timestamp;
        });
        await this.db.accounts.put ( _.cloneDeep ( this.version ));

        return true;
    }

    //----------------------------------------------------------------//
    async updateSchema ( schemaHash, schemaVersion ) {

        const schema        = false;

        if ( !( schemaHash && schemaVersion )) return;
        let schemaKey = this.formatSchemaKey ( schemaHash, schemaVersion );

        if ( this.schema ) {
            const networkRecord = await this.db.networks.get ( this.networkID );
            if ( networkRecord && ( networkRecord.schemaKey === schemaKey )) return;
        }

        await this.db.schemas.where ({ networkID: this.networkID }).delete ();

        const schemaInfo = await this.revocable.fetchJSON ( this.networkService.getServiceURL ( '/schema' ));

        schemaKey = this.formatSchemaKey ( schemaInfo.schemaHash, schemaInfo.schema.version );
        await this.db.schemas.put ({ networkID: this.networkID, key: schemaKey, schema: schemaInfo.schema });
        await this.db.networks.put ({ networkID: this.networkID, schemaKey: schemaKey });

        await this.makeSchema ( schemaInfo.schema );
    }
}
