// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { NODE_TYPE, NODE_STATUS }   from './AppStateService';
import { assert, excel, hooks, RevocableContext, SingleColumnContainerView, storage, util } from 'fgc';
import { action, computed, extendObservable, observe, observable } from 'mobx';

//================================================================//
// NodeInfoService
//================================================================//
export class NodeInfoService {

    //----------------------------------------------------------------//
    constructor ( appState ) {
        
        this.revocable      = new RevocableContext ();
        this.pendingURLs    = {};

        extendObservable ( this, {
            appState:   appState,
        });

        this.discoverNodes ( 5000 );
    }

    //----------------------------------------------------------------//
    discoverNodes ( delay ) {

        const discoverNode = async ( url ) => {

            try {
                await NodeInfoService.update ( this, this.appState, url )
                delete ( this.pendingURLs [ url ]);
            }
            catch ( error ) {

                this.appState.setNodeInfo ( url, type, NODE_STATUS.OFFLINE );
                throw error;
            }
        }

        for ( let url in this.appState.nodes ) {
            if ( !( url in this.pendingURLs )) {
                this.pendingURLs [ url ] = true;
                this.revocable.promiseWithBackoff (() => discoverNode ( url ), delay );
            }
        }
        this.revocable.timeout (() => { this.discoverNodes ( delay )}, delay );
    }

    //----------------------------------------------------------------//
    finalize () {

        this.revocable.finalize ();
    }

    //----------------------------------------------------------------//
    static async update ( service, appState, url ) {

        const data = await service.revocable.fetchJSON ( url );

        let { type } = appState.getNodeInfo ( url );

        if ( data.type === 'VOL_MINING_NODE' ) {
            type = NODE_TYPE.MINING;
        }
        if ( data.type === 'VOL_PROVIDER' ) {
            type = NODE_TYPE.MARKET;
        }

        appState.setNodeInfo ( url, type, NODE_STATUS.ONLINE, data.identity );
    }
}
