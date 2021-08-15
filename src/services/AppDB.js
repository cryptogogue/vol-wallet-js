// Copyright (c) 2019 Cryptogogue, Inc. All Rights Reserved.

import Dexie                        from 'dexie';

//================================================================//
// AppDB
//================================================================//
export class AppDB {

    //----------------------------------------------------------------//
    constructor () {

        // TODO: yes, this is gross for a lot of reasons, but it's expedient for now.
        // TODO: break this out into a better DB structure.
        // TODO: distribute ownership of this to the appropriate services.

        this.db = new Dexie ( 'volwal' );
        this.db.version ( 1 ).stores ({
            networks:               'networkID',
            schemas:                '[networkID+key], networkID',
            accounts:               '[networkID+accountIndex], networkID',
            assets:                 '[networkID+accountIndex+assetID], [networkID+accountIndex], networkID',
            transactionHistory:     '[networkID+accountIndex]',
            transactionQueue:       '[networkID+accountIndex]',
            inbox:                  '[networkID+accountIndex+assetID], [networkID+accountIndex]',
            inventoryDelta:         '[networkID+accountIndex]',
        });
        this.db.open ();
    }

    //----------------------------------------------------------------//
    async deleteAccountAsync ( networkID, accountIndex ) {

        await this.db.accounts.where ({ networkID: networkID, accountIndex: accountIndex }).delete ();
        await this.db.assets.where ({ networkID: networkID, accountIndex: accountIndex }).delete ();
        await this.db.transactionHistory.where ({ networkID: networkID, accountIndex: accountIndex }).delete ();
        await this.db.transactionQueue.where ({ networkID: networkID, accountIndex: accountIndex }).delete ();
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
