// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { PasswordInputField }               from './PasswordInputField';
import JSONTree                             from 'react-json-tree';
import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import * as UI                              from 'semantic-ui-react';

//================================================================//
// DecryptAndSignWithKeyModal
//================================================================//
export const SignWithKeyModal = observer (( props ) => {

    const { accountService, keyName, onClose }      = props;
    const [ encoded, setEncoded ]                   = useState ( '' );
    const [ password, setPassword ]                 = useState ( '' );
    const [ passwordCount, setPasswordCount ]       = useState ( 0 );

    const [ msgEnvelope, setMsgEnvelope ]           = useState ( false );
    const [ plaintext, setPlaintext ]               = useState ( false );

    const [ sigEnvelope, setSigEnvelope ]           = useState ( false );
    const [ sigEncoded, setSigEncoded ]             = useState ( false );

    const [ error, setError ]                       = useState ( false );

    const appState      = accountService.appState;
    const key           = accountService.account.keys [ keyName ];

    const onChange = async ( event ) => {
        setEncoded ( event.target.value );
        setError ( false );
    }

    const onClickDecrypt = async () => {

        const escaped = encoded.replace ( /(\r\n|\n|\r )/gm, '' );
        const envelope = JSON.parse ( Buffer.from ( escaped, 'base64' ).toString ( 'utf8' ));

        const keyPair       = await accountService.getKeyPairAsync ( keyName, password );
        const plaintext     = keyPair.decrypt ( envelope.ciphertext, envelope.fromPublicHex );

        setPasswordCount ( passwordCount + 1 );

        if ( plaintext === false ) {
            setError ( 'Could not decrypt with this key.' );
            return;
        }
        setMsgEnvelope ( envelope );
        setPlaintext ( plaintext );
    }

    const onClosePlaintextModal = () => {
        setMsgEnvelope ( false );
        setPlaintext ( false );
        setPassword ( '' );
    }

    const onClickSign = async () => {

        const keyPair       = await accountService.getKeyPairAsync ( keyName, password );
        const signature     = keyPair.sign ( plaintext );

        const envelope = {
            publicHex:          accountService.account.keys [ keyName ].publicKeyHex,
            messageID:          msgEnvelope.messageID,
            signature:          signature,
        }

        const encoded = Buffer.from ( JSON.stringify ( envelope ), 'utf8' ).toString ( 'base64' );

        setSigEnvelope ( envelope );
        setSigEncoded ( encoded );
    }

    const onCloseSigModal = () => {
        setSigEnvelope ( false );
        setSigEncoded ( false );
        onClosePlaintextModal ();
    }

    const canDecrypt = password && encoded;

    return (
        <React.Fragment>

            {/******************************************************************
                DECRYPT & SIGN MODAL
            ******************************************************************/}
            <UI.Modal
                open
                closeIcon
                size        = 'small'
                onClose     = {() => { onClose ()}}
            >
                <UI.Modal.Header>Sign</UI.Modal.Header>
                <UI.Modal.Content>
                    <UI.Form>
                        <UI.Form.TextArea
                            rows            = { 8 }
                            value           = { plaintext }
                            onChange        = { onChange }
                            error           = { false }
                            label           = 'String'
                            error           = { error }
                        />
                        <PasswordInputField
                            key             = { passwordCount }
                            appState        = { appState }
                            setPassword     = { setPassword }
                        />
                    </UI.Form>
                </UI.Modal.Content>
                <UI.Modal.Actions>
                    <UI.Button
                        positive
                        onClick     = { onClickSign }
                    >
                        Sign
                    </UI.Button>
                </UI.Modal.Actions>
            </UI.Modal>

            {/******************************************************************
                PLAINTEXT MODAL
            ******************************************************************/}
            <UI.Modal
                closeIcon
                size        = 'small'
                onClose     = { onClosePlaintextModal }
                open        = { plaintext !== false }
            >
                <UI.Modal.Header>Message</UI.Modal.Header>
                <UI.Modal.Content>
                    <UI.Segment>
                        { plaintext }
                    </UI.Segment>
                </UI.Modal.Content>
                <UI.Modal.Actions>
                    <UI.Button
                        positive
                        onClick     = { onClickSign }
                    >
                        Sign
                    </UI.Button>
                </UI.Modal.Actions>
            </UI.Modal>

            {/******************************************************************
                SIGNATURE MODAL
            ******************************************************************/}
            <UI.Modal
                closeIcon
                size        = 'small'
                onClose     = { onCloseSigModal }
                open        = { sigEnvelope !== false }
            >
                <UI.Modal.Header>Signature</UI.Modal.Header>
                <UI.Modal.Content>
                    <UI.Segment>
                        <JSONTree
                            data                = { sigEnvelope }
                            theme               = 'bright'
                            shouldExpandNode    = {() => { return true; }}
                        />

                        <UI.Segment
                            raised
                            style = {{
                                wordBreak: 'break-all',
                                wordWrap: 'break-word',
                                overflowWrap: 'break-word',
                                fontFamily: 'monospace',
                            }}
                        >
                            <UI.Header as = 'h3'>Base 64</UI.Header>
                            { sigEncoded }
                        </UI.Segment>
                    </UI.Segment>
                </UI.Modal.Content>
            </UI.Modal>

        </React.Fragment>
    );
});
