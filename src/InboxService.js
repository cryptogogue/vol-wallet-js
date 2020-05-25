// Copyright (c) 2019 Cryptogogue, Inc. All Rights Reserved.

import { assert, ProgressController, RevocableContext, util } from 'fgc';
import { action, computed, extendObservable, observable, observe, reaction, runInAction } from 'mobx';
import _ from 'lodash';

//================================================================//
// InboxService
//================================================================//
export class InboxService {

    //----------------------------------------------------------------//
    constructor ( appState, inventoryController, progressController ) {

        this.revocable = new RevocableContext ();

        this.progress   = progressController || new ProgressController ();
        this.inventory  = inventoryController;

        this.revocable.timeout (() => {
            this.fetchSchema ( appState.network.nodeURL, appState.accountID, appState.accountInfo.newAssets );
        }, 1 );
    }

    //----------------------------------------------------------------//
    finalize () {

        this.revocable.finalize ();
    }

    //----------------------------------------------------------------//
    async fetchSchema ( nodeURL, accountID, newAssetList ) {

        try {
            this.progress.setLoading ( true );

            this.progress.onProgress ( 'Fetching New Assets' );
            const schemaJSON = await this.revocable.fetchJSON ( nodeURL + '/schema' );

            const assets = {};
            for ( let asset of newAssetList ) {
                assets [ asset.assetID ] = asset;
            }

            await this.inventory.update ( schemaJSON.schema, assets );
        }
        catch ( error ) {
            console.log ( error );
        }
        this.progress.setLoading ( false );
    }
}
