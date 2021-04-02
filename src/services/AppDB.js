// Copyright (c) 2019 Cryptogogue, Inc. All Rights Reserved.

import { Schema }                   from 'cardmotron';
import { assert, ProgressController, RevocableContext, util } from 'fgc';
import { action, computed, extendObservable, observable, observe, reaction, runInAction } from 'mobx';
import Dexie                        from 'dexie';
import _                            from 'lodash';

//const debugLog = function () {}
const debugLog = function ( ...args ) { console.log ( '@INVENTORY:', ...args ); }

//================================================================//
// AppDB
//================================================================//
export class AppDB {

    //----------------------------------------------------------------//
    constructor ( accountService, inventoryController, progressController ) {

        this.db = new Dexie ( 'volwal' ); 
        this.db.version ( 1 ).stores ({
            networks:   'networkID',
            schemas:    '[networkID+key], networkID',
            accounts:   '[networkID+accountID], networkID',
            assets:     '[networkID+accountID], networkID',
        });
        this.db.open ();
    }

    //----------------------------------------------------------------//
    async deleteAccountAsync ( networkID, accountID ) {

        await this.db.accounts.where ({ networkID: networkID, accountID: accountID }).delete ();
        await this.db.assets.where ({ networkID: networkID, accountID: accountID }).delete ();
    }

    //----------------------------------------------------------------//
    async deleteNetworkAsync ( networkID ) {

        await this.db.networks.where ({ networkID: networkID }).delete ();
        await this.db.schemas.where ({ networkID: networkID }).delete ();
        await this.db.accounts.where ({ networkID: networkID }).delete ();
        await this.db.assets.where ({ networkID: networkID }).delete ();
    }

    //----------------------------------------------------------------//
    finalize () {
    }
}
