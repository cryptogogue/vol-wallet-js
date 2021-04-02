// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AppStateService }              from './AppStateService';
import { NetworkStateService }          from './NetworkStateService';
import { InventoryController }          from 'cardmotron';
import { assert, crypto, excel, ProgressController, randomBytes, RevocableContext, SingleColumnContainerView, StorageContext, util } from 'fgc';
import * as bcrypt                      from 'bcryptjs';
import _                                from 'lodash';
import { action, computed, extendObservable, observable, observe, reaction, runInAction } from 'mobx';
import React                            from 'react';
import url                              from 'url';

//const debugLog = function () {}
const debugLog = function ( ...args ) { console.log ( 'NETWORK LIST:', ...args ); }

const STORE_NETWORK_IDS         = '.vol_network_ids';

//================================================================//
// NetworkListService
//================================================================//
export class NetworkListService {

    @observable networkIDs      = [];
    @observable networksByID    = {};
    @observable networks        = [];

    //----------------------------------------------------------------//
    @action
    affirmNetwork ( networkID, nodeURL, identity ) {

        if ( _.has ( this.networksByID, networkID )) return;

        debugLog ( 'affirmNetwork', networkID );

        const network = new NetworkStateService ( this.appState, networkID, nodeURL, identity );
        this.networksByID [ networkID ] = network;
        this.networks.push ( network );

        if ( !this.networkIDs.includes ( networkID )) {
            this.networkIDs.push ( networkID );   
        }
    }

    //----------------------------------------------------------------//
    constructor ( appState ) {

        this.appState = appState || new AppStateService ();

        this.storage = new StorageContext ();
        this.storage.persist ( this, 'networkIDs',        STORE_NETWORK_IDS,          []);

        for ( let networkID of this.networkIDs ) {
            debugLog ( 'loading network', networkID );
            this.affirmNetwork ( networkID );
        }
    }

    //----------------------------------------------------------------//
    @action
    deleteNetwork ( networkID ) {

        if ( !this.networkIDs.includes ( networkID )) return;

        debugLog ( 'deleting network', networkID );

        const network = this.networksByID [ networkID ];
        
        this.networkIDs.splice ( this.networkIDs.indexOf ( networkID ), 1 );
        this.networks.splice ( this.networkIDs.indexOf ( network ), 1 );
        delete this.networksByID [ networkID ];

        network.deleteNetwork ();
    }

    //----------------------------------------------------------------//
    finalize () {

        for ( let network of this.networks ) {
            network.finalize ();
        }
        this.storage.finalize ();
    }

    //----------------------------------------------------------------//
    @action
    getNetworkService ( networkID ) {

        return this.networksByID [ networkID ] || false;
    }

    //----------------------------------------------------------------//
    @action
    hasNetwork ( networkID ) {

        return _.has ( this.networksByID, networkID );
    }
}
