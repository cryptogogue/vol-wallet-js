// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { CraftingAssetSelectionModal }      from './CraftingAssetSelectionModal';
import { InvocationAssetParamRow }          from './InvocationAssetParamRow';
import CryptoJS                             from 'crypto-js';
import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import * as UI                              from 'semantic-ui-react';
import * as vol                             from 'vol';

//----------------------------------------------------------------//
// TODO: DRY
async function loadImageAsync ( image, src ) {

    return new Promise (( resolve, reject ) => {

        image.onload = () => {
            resolve ();
        }

        image.onerror = () => {
            reject ();
        }

        image.src = src;
    });
}

//================================================================//
// InvocationConstImageParamField
//================================================================//
export const InvocationConstImageParamField = observer (( props ) => {

    const { controller, paramName, invocation } = props;

    const [ inputString, setInputString ]   = useState ( '' );
    const [ isBusy, setIsBusy ]             = useState ( false );
    const [ imageHash, setImageHash ]       = useState ( '' );
    const [ error, setError ]               = useState ( undefined );

    const onChange = ( event ) => {
        setInputString ( event.target.value );
    };

    const onKeyPress = ( event ) => {
        if ( event.key === 'Enter' ) {
            event.target.blur ();
        }
    }

    const onBlur = async () => {

        // reset previous values (if any)
        controller.setConstParam ( invocation, paramName, '' );
        setImageHash ( '' );
        setError ( undefined );

        if ( !inputString ) {
            controller.setConstParam ( invocation, paramName, '' );
            return;
        }

        // start the spinner
        setIsBusy ( true );

        try {

            // make sure it's an image
            const image         = new Image ();
            await loadImageAsync ( image, inputString );

            const result        = await fetch ( inputString );
            const arrayBuffer   = await result.arrayBuffer ();
            const sha256        = CryptoJS.SHA256 ( CryptoJS.lib.WordArray.create ( arrayBuffer )).toString ( CryptoJS.enc.Hex );

            setImageHash ( sha256 );
            controller.setConstParam ( invocation, paramName, inputString );
        }
        catch ( e ) {
            console.log ( e );
            setError ( 'Failed to fetch image.' );
        }

        // stop the spinner
        setIsBusy ( false );
    };

    const imageURL = invocation.constParams [ paramName ].value || false;

    return (
        <React.Fragment>
            <UI.Form.Input
                fluid
                key             = { paramName }
                label           = { paramName }
                placeholder     = 'String Param'
                type            = 'string'
                name            = { paramName }
                value           = { inputString }
                onChange        = { onChange }
                onKeyPress      = { onKeyPress }
                onBlur          = { onBlur }
                disabled        = { isBusy }
                error           = { error }
            />
            <Choose>
                <When condition = { isBusy }>
                    <UI.Loader
                        active
                        inline = 'centered'
                        size = 'large'
                        style = {{ marginTop:'5%' }}
                    >
                        Fetching Image...
                    </UI.Loader>
                </When>
                <Otherwise>
                    <If condition = { imageURL }>
                        <UI.Image
                            src = { imageURL }
                        />                
                        <UI.Message
                            header  = 'SHA256'
                            content = { imageHash }
                        />
                    </If>
                </Otherwise>
            </Choose>
        </React.Fragment>
    );
});
