// Copyright (c) 2019 Cryptogogue, Inc. All Rights Reserved.

import Dexie                        from 'dexie';

//const debugLog = function () {}
const debugLog = function ( ...args ) { console.log ( '@DB WORKER:', ...args ); }

let counter = 0;
debugLog ( 'EXECUTING APP DB WORKER', counter++ );

export const db = new Dexie ( 'volwal' );

db.version ( 1 ).stores ({
    networks:               'networkID',
    schemas:                '[networkID+key], networkID',
    accounts:               '[networkID+accountIndex], networkID',
    assets:                 '[networkID+accountIndex+assetID], [networkID+accountIndex], networkID',
    assetSVGs:              '[networkID+accountIndex+assetID], [networkID+accountIndex], networkID',
    transactions:           '[networkID+accountIndex+uuid], [networkID+accountIndex], networkID',
    transactionHistory:     '[networkID+accountIndex], networkID',
    transactionQueue:       '[networkID+accountIndex], networkID',
    inbox:                  '[networkID+accountIndex+assetID], [networkID+accountIndex]',
    inventoryDelta:         '[networkID+accountIndex]',
});
db.open ();

//----------------------------------------------------------------//
async function handleMessageAsync ( event ) {

    const id        = event.data.id;
    const command   = event.data.command;
    const params    = event.data.params;

    debugLog ( 'handle message', id, command );

    const response = {
        id:         id,
        command:    command,
    }

    switch ( command ) {

        case 'DELETE_ACCOUNT': {

            const [ networkID, accountIndex ] = params;

            await db.accounts.where ({ networkID: networkID, accountIndex: accountIndex }).delete ();
            await db.assets.where ({ networkID: networkID, accountIndex: accountIndex }).delete ();
            await db.assetSVGs.where ({ networkID: networkID, accountIndex: accountIndex }).delete ();

            await db.transactions.where ({ networkID: networkID, accountIndex: accountIndex }).delete ();
            await db.transactionHistory.where ({ networkID: networkID, accountIndex: accountIndex }).delete ();
            await db.transactionQueue.where ({ networkID: networkID, accountIndex: accountIndex }).delete ();

            break;
        }

        case 'DELETE_NETWORK': {

            const [ networkID ] = params;

            await db.networks.where ({ networkID: networkID }).delete ();
            await db.schemas.where ({ networkID: networkID }).delete ();
            await db.accounts.where ({ networkID: networkID }).delete ();

            await db.assets.where ({ networkID: networkID }).delete ();
            await db.assetSVGs.where ({ networkID: networkID }).delete ();
            
            await db.transactions.where ({ networkID: networkID }).delete ();
            await db.transactionHistory.where ({ networkID: networkID }).delete ();
            await db.transactionQueue.where ({ networkID: networkID }).delete ();

            break;
        }

        case 'DELETE_WHERE': {

            const [ tableName, key ] = params;
            await db [ tableName ].where ( key ).delete ();
            break;
        }

        case 'GET': {

            const [ tableName, key ] = params;
            response.result = await db [ tableName ].get ( key );
            break;
        }

        case 'PUT': {

            const [ tableName, row ] = params;
            await db [ tableName ].put ( row );
            break;
        }

        case 'PUT_ASSET': {

            const [ networkID, accountIndex, asset, svg ] = params;
            await db.transaction ( 'rw', db.assets, db.assetSVGs, db.inbox, async () => {
                await db.assets.put ({ networkID: networkID, accountIndex: accountIndex, assetID: asset.assetID, asset: asset });
                if ( svg ) {
                    await db.assetSVGs.put ({ networkID: networkID, accountIndex: accountIndex, assetID: asset.assetID, svg: svg });
                    await db.inbox.put ({ networkID: networkID, accountIndex: accountIndex, assetID: asset.assetID });
                }
            });
            break;
        }

        case 'QUERY': {

            const [ tableName, key ] = params;
            response.result = await db [ tableName ].where ( key ).toArray ();
            break;
        }
    }

    debugLog ( 'done handle message', id, command, response.result );

    postMessage ( response );
}

self.addEventListener ( 'message', handleMessageAsync );
debugLog ( 'web worker initialized and listening' );
postMessage ( true );

