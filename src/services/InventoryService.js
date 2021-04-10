// Copyright (c) 2019 Cryptogogue, Inc. All Rights Reserved.

import { Schema }                   from 'cardmotron';
import { assert, ProgressController, RevocableContext, util } from 'fgc';
import { action, computed, extendObservable, observable, observe, reaction, runInAction } from 'mobx';
import Dexie                        from 'dexie';
import _                            from 'lodash';
import url                          from 'url';

//const debugLog = function () {}
const debugLog = function ( ...args ) { console.log ( '@INVENTORY:', ...args ); }

//================================================================//
// InventoryService
//================================================================//
export class InventoryService {

    @observable assets          = {};
    @observable version         = false;
    @observable isLoaded        = false;

    @computed get accountID     () { return this.accountService.accountID; }
    @computed get networkID     () { return this.accountService.networkService.networkID; }
    @computed get nonce         () { return this.version.nonce; }
    @computed get serverNonce   () { return this.version.serverNonce; }

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
                accountID:      this.accountID,
                nonce:          0,
                serverNonce:    0,
                timestamp:      false,
            }
        });
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

        if ( !this.isLoaded ) return 0;

        let count = 0;
        for ( let assetID in this.assets ) {
            if ( this.isNew ( assetID )) {
                count++;
            }
        }
        debugLog ( 'INBOX SIZE:', count );
        return count;
    }

    //----------------------------------------------------------------//
    isNew ( assetID ) {

        const asset = this.assets [ assetID ];
        return asset ? ( this.nonce <= asset.inventoryNonce ) : false;
    }

    //----------------------------------------------------------------//
    async loadAssetsAsync () {

        debugLog ( 'LOADING ASSETS' );

        let assets = {};
        
        const record = await this.db.assets.get ({ networkID: this.networkID, accountID: this.accountID });
        
        if ( record ) {
            debugLog ( 'HAS CACHED ASSETS' );
            assets = JSON.parse ( record.assets );
        }

        runInAction (() => {
            this.assets = assets;
        });

        this.inventory.setAssets ( assets );
    }

    //----------------------------------------------------------------//
    async loadAsync () {

        if ( this.isLoaded ) return;
        
        this.progress.setLoading ( true );

        const version = await this.db.accounts.get ({ networkID: this.networkID, accountID: this.accountID });
        if ( version ) {

            debugLog ( 'LOADING SCHEMA AND INVENTORY FROM DB' );

            const schemaRecord = await this.db.schemas.get ({ networkID: this.networkID });
            if ( schemaRecord ) {

                debugLog ( 'HAS SCHEMA RECORD' );

                await this.makeSchema ( JSON.parse ( schemaRecord.json ));
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
        if ( !this.isLoaded ) return newAssets;

        for ( let assetID in this.assets ) {
            if ( this.isNew ( assetID )) {
                newAssets [ assetID ] = this.assets [ assetID ];
            }
        }
        debugLog ( 'NEW ASSETS:', newAssets );
        return newAssets;
    }

    //----------------------------------------------------------------//
    @action
    async reset () {

        debugLog ( 'RESET' );

        this.version.nonce          = 0;
        this.version.serverNonce    = 0;
        this.version.timestamp      = false;

        if ( Object.keys ( this.assets ).length > 0 ) {
            this.assets = {};
            this.inventory.setAssets ({});
            await this.db.assets.where ({ networkID: this.networkID, accountID: this.accountID }).delete ();
        }

        await this.db.accounts.put ( _.cloneDeep ( this.version ));
    }

    //----------------------------------------------------------------//
    async serviceStep () {

        let more = false;

        try {
            await this.loadAsync ();
            more = await this.updateAsync ();
        }
        catch ( error ) {
            debugLog ( error );
        }
        return more;
    }

    //----------------------------------------------------------------//
    async updateAsync () {

        debugLog ( 'UPDATE' );

        let more = false;

        this.progress.setLoading ( true );

        await this.progress.onProgress ( 'Updating Inventory' );

        const data = await this.revocable.fetchJSON ( this.networkService.getServiceURL ( `/accounts/${ this.accountID }/inventory` ));

        debugLog ( 'STATUS FROM SERVER:', data );

        if ( data.inventoryTimestamp ) {

            await this.updateSchema ( data.schemaHash, data.schemaVersion );
            if ( this.schema ) {

                await this.progress.onProgress ( 'Updating Inventory' );
                debugLog ( 'UPDATING INVENTORY' );
                more = await this.updateDeltaAsync ( data.inventoryNonce, data.inventoryTimestamp );
            }
        }
        else {
            await this.reset ();
        }

        this.progress.setLoading ( false );
        return more;
    }

    //----------------------------------------------------------------//
    async updateDeltaAsync ( nextNonce, timestamp ) {

        debugLog ( 'UPDATE DELTA' );

        let currentNonce = this.version.serverNonce;

        debugLog ( 'CURRENT NONCE:', currentNonce );
        debugLog ( 'NEXT NONCE:', nextNonce );
        debugLog ( 'TIMESTAMP:', timestamp );

        if ( nextNonce === currentNonce ) return;
        if (( timestamp !== this.version.timestamp ) || ( nextNonce < currentNonce )) {
            debugLog ( 'TIMESTAMP MISMATCH OR NONCE ROLLBACK; RESETTING' );
            await this.reset ();
            currentNonce = 0;
        }

        await this.progress.onProgress ( 'Fetching Inventory' );

        const count     = nextNonce - currentNonce;
        const url       = this.networkService.getServiceURL ( `/accounts/${ this.accountID }/inventory/log/${ currentNonce }`, { count: count });
        const data      = await this.revocable.fetchJSON ( url );

        if ( data.nextNonce <= currentNonce ) return false;

        const assetsSent = _.clone ( this.accountService.account.assetsSent || {});

        runInAction (() => {

            for ( let asset of data.assets ) {
                delete assetsSent [ asset.assetID ];
                debugLog ( 'ADDING ASSET', asset.assetID );
                this.assets [ asset.assetID ] = asset;
                this.inventory.setAsset ( asset );
            }

            for ( let assetID of data.deletions ) {
                delete assetsSent [ assetID ];
                if ( data.additions.includes ( assetID )) continue;
                debugLog ( 'DELETING ASSET', assetID );
                delete this.assets [ assetID ];
                this.inventory.deleteAsset ( assetID );
            }

            this.accountService.account.assetsSent = assetsSent;
        });

        await this.db.assets.put ({ networkID: this.networkID, accountID: this.accountID, assets: JSON.stringify ( this.assets )});

        this.inventory.setAssets ( this.assets );

        runInAction (() => {
            this.version.serverNonce    = data.nextNonce;
            this.version.timestamp      = timestamp;
        });
        await this.db.accounts.put ( _.cloneDeep ( this.version ));

        return true;
    }

    //----------------------------------------------------------------//
    async updateNonceAsync () {
        runInAction (() => {
            this.version.nonce = this.version.serverNonce;
        });
        await this.db.accounts.put ( _.cloneDeep ( this.version ));
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

        const schemaInfo = ( await this.revocable.fetchJSON ( this.networkService.getServiceURL ( '/schema' )));

        schemaKey = this.formatSchemaKey ( schemaInfo.schemaHash, schemaInfo.schema.version );
        await this.db.schemas.put ({ networkID: this.networkID, key: schemaKey, json: JSON.stringify ( schemaInfo.schema )});
        await this.db.networks.put ({ networkID: this.networkID, schemaKey: schemaKey });

        await this.makeSchema ( schemaInfo.schema );
    }
}
