// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.
import _ from 'lodash';
import { observer } from 'mobx-react';
import React, { useState, useEffect } from 'react';
import { util } from 'fgc';
import { RevocableContext }          from 'fgc';
import { Schema, AssetView  }    from 'cardmotron';
import { renderSVGAsync, verifyImagesAsync } from 'cardmotron' 
import ReactDomServer                                       from 'react-dom/server';

//================================================================//
// AssetPngView
//================================================================//
export const AssetJPEGView = observer((props) => {

    let width = 750;
    let height =  1050;
    let DPI = 300;
    const [asset, setAsset] = useState('');
    const [schema, setSchema] = useState('');
    const [dataUrl, setDataUrl] = useState('');
    useEffect(() => {
        // You need to restrict it at some point
        // This is just dummy code and should be replaced by actual
        if (!asset && !schema) {
            getAssetAndSchema();
        }
    }, []);

    function dataURItoBlob(dataURI) {
        // convert base64 to raw binary data held in a string
        // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
        var byteString = atob(dataURI.split(',')[1]);
      
        // separate out the mime component
        var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]
      
        // write the bytes of the string to an ArrayBuffer
        var ab = new ArrayBuffer(byteString.length);
      
        // create a view into the buffer
        var ia = new Uint8Array(ab);
      
        // set the bytes of the buffer to the correct values
        for (var i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
      
        // write the ArrayBuffer to a blob, and you're done
        var blob = new Blob([ab], {type: mimeString});
        return blob;
      
      }

    const getAssetAndSchema = async () => {
        const assetID = util.getMatch(props, 'assetID');
        const nodeUrl = util.getMatch(props, 'nodeUrl');
        // FIXME: get node url automaticly based on network, how?
        let revocable = new RevocableContext();
        const schemaInfo = await revocable.fetchJSON ( `https://${nodeUrl}/schema`);
        const assetData = await revocable.fetchJSON ( `https://${nodeUrl}/assets/${assetID}`);
        const schemaLoc = new Schema ( schemaInfo.schema );
        await schemaLoc.affirmFontsAsync ();
        setSchema(schemaLoc);
        setAsset(assetData.asset); 
        const assetSVG = await verifyImagesAsync ( await schemaLoc.renderAssetSVG ( assetData.asset ));
        const svg = ReactDomServer.renderToStaticMarkup (
            <svg
                version         = "1.1"
                baseProfile     = "basic"
                xmlns           = "http://www.w3.org/2000/svg"
                width           = { `${ width }` }
                height          = { `${ height }` }
                viewBox         = { `0 0 ${ width } ${ height }` }
                preserveAspectRatio = "xMidYMid meet"
            >
                <rect width = { width } height = { height } style = {{ fill: '#ffffff' }}/>
                <AssetView schema={schemaLoc} asset = { assetData.asset } svg = { assetSVG } />
            </svg>
        );
        const durl = await renderSVGAsync (svg, width, height, DPI);
        setDataUrl(durl);
        //FileSaver.saveAs ( dataURItoBlob(durl), assetID+".jpg" );
    };


    return (
        <If condition = { asset && schema && dataUrl }>
         <img
                            src     = { dataUrl }
                            width   = { width }
                            height  = { height }
                        />
        </If>
    );
});
