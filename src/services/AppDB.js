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

        // TODO: yes, this is gross for a lot of reasons, but it's expedient for now.
        // TODO: break this out into a better DB structure.
        // TODO: distribute ownership of this to the appropriate services.

        this.db = new Dexie ( 'volwal' );
        this.db.version ( 1 ).stores ({
            networks:               'networkID',
            schemas:                '[networkID+key], networkID',
            accounts:               '[networkID+accountIndex], networkID',
            assets:                 '[networkID+accountIndex], networkID',
            transactionHistory:     '[networkID+accountIndex]',
            transactionQueue:       '[networkID+accountIndex]',
            inbox:                  '[networkID+accountIndex]',
        });
        this.db.open ();
    }

    //----------------------------------------------------------------//
    async deleteAccountAsync ( networkID, accountIndex ) {

        await this.db.accounts.where ({ networkID: networkID, accountIndex: accountIndex }).delete ();
        await this.db.assets.where ({ networkID: networkID, accountIndex: accountIndex }).delete ();
        await this.db.transactions.where ({ networkID: networkID, accountIndex: accountIndex }).delete ();
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
