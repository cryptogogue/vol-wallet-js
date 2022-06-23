// Copyright (c) 2019 Cryptogogue, Inc. All Rights Reserved.

import AppDBWorker                  from './AppDBWorker.worker';

const debugLog = function () {}
//const debugLog = function ( ...args ) { console.log ( '@DB:', ...args ); }

debugLog ( 'EXECUTING APP DB' );

let worker      = false;
let isLoaded    = false;

// TODO: find a better way
let unique = 0;

//----------------------------------------------------------------//
async function loadWorker () {

    if ( isLoaded ) return worker; 

    return new Promise (( resolve, reject ) => {
        
        const handler = async ( event ) => {
            debugLog ( 'got worker loaded message' );
            worker.removeEventListener ( 'message', handler );
            isLoaded = true;
            resolve ();
        }
        worker = worker || new AppDBWorker ();
        worker.addEventListener ( 'message', handler );
        debugLog ( 'added load listener' );
    });
};

//----------------------------------------------------------------//
async function callWorkerMethodAsync ( command, ...params ) {

    await loadWorker ();

    let id = unique++;

    debugLog ( 'call worker method', command, id, params );

    return new Promise (( resolve, reject ) => {
        
        const handler = async ( event ) => {

            if ( event.data.id === id ) {

                debugLog ( 'done call worker method', command, id, event.data.result );

                worker.removeEventListener ( 'message', handler );
                resolve ( event.data.result );
            }
        }
        worker.addEventListener ( 'message', handler );
        worker.postMessage ({ id: id, command: command, params: params });
        debugLog ( 'call worker method posted...' );
    });
};

//----------------------------------------------------------------//
export async function deleteAccountAsync ( networkID, accountIndex ) {

    await callWorkerMethodAsync ( 'DELETE_ACCOUNT', networkID, accountIndex );
}

//----------------------------------------------------------------//
export async function deleteNetworkAsync ( networkID ) {

    await callWorkerMethodAsync ( 'DELETE_NETWORK', networkID );
}

//----------------------------------------------------------------//
export async function deleteWhereAsync ( tableName, key ) {

    await callWorkerMethodAsync ( 'DELETE_WHERE', tableName, key );
}

//----------------------------------------------------------------//
export async function getAsync ( tableName, key ) {

    return await callWorkerMethodAsync ( 'GET', tableName, key );
}

//----------------------------------------------------------------//
// hack this in for now; too tedious to generically wrap dexie transaction
export async function putAssetAsync ( networkID, accountIndex, asset, svg ) {

    await callWorkerMethodAsync ( 'PUT_ASSET', networkID, accountIndex, asset, svg );
}

//----------------------------------------------------------------//
export async function putAsync ( tableName, row ) {

    await callWorkerMethodAsync ( 'PUT', tableName, row );
}

//----------------------------------------------------------------//
export async function queryAsync ( tableName, key ) {

    return await callWorkerMethodAsync ( 'QUERY', tableName, key );
}
