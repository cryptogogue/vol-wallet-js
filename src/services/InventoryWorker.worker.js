import { Schema }           from 'cardmotron-worker';

/* eslint-disable no-restricted-globals */

let schema      = false;

//----------------------------------------------------------------//
async function handleMessage ( event ) {

    const schemaObj = event.data.schemaObj || false;

    if ( schemaObj ) {
        schema = new Schema ( schemaObj );
        postMessage ( '' );
        return;
    }

    let asset = event.data.asset || false;

    if ( asset ) {

        await schema.affirmFontsAsync ();

        console.log ( 'WORKER expanding asset:', asset.assetID );
        asset       = schema.expandAsset ( asset );
        const svg   = schema.renderAssetSVG ( asset );
        postMessage ({ asset: asset, svg: svg });
        return;
    }
}

self.addEventListener ( 'message', handleMessage );
