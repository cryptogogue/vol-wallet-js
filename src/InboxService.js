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

        this.fetchSchema ( appState.network.nodeURL, appState.accountID, appState.accountInfo.newAssets );
    }

    //----------------------------------------------------------------//
    finalize () {

        this.revocable.finalize ();
    }

    //----------------------------------------------------------------//
    async fetchSchema ( nodeURL, accountID, assets ) {

        try {
            this.progress.setLoading ( true );

            this.progress.onProgress ( 'Fetching Schema' );
            const schemaJSON        = await this.revocable.fetchJSON ( nodeURL + '/schema' );
            console.log ( schemaJSON );

            await this.inventory.update ( schemaJSON.schema, assets );
        }
        catch ( error ) {
            console.log ( error );
        }
        this.progress.setLoading ( false );
    }
}
