import { Schema }           from 'cardmotron-worker';

/* eslint-disable no-restricted-globals */

let schema = false;

async function handleMessage ( event ) {

    const schemaObj = event.data.schemaObj || false;

    if ( schemaObj ) {
        schema = new Schema ( schemaObj );
        this.postMessage ( '' );
        return;
    }

    const assets = event.data.assets || false;

    if ( assets ) {

        await schema.affirmFontsAsync ();

        const expandedAssets = [];
        for ( let asset of assets ) {
            console.log ( 'WORKER expanding asset:', asset.assetID );
            expandedAssets.push ( schema.expandAsset ( asset ));
        }
        this.postMessage ( expandedAssets );
        return;
    }
}

self.addEventListener ( 'message', handleMessage );
