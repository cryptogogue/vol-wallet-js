// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { PasswordInputField }               from './PasswordInputField';
import JSONTree                             from 'react-json-tree';
import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import * as UI                              from 'semantic-ui-react';

//================================================================//
// EncryptWithKeyModal
//================================================================//
export const EncryptWithKeyModal = observer (( props ) => {

    const { accountService, keyName, onClose }      = props;
    
    const [ publicHex, setPublicHex ]               = useState ( '' );
    const [ plaintext, setPlaintext ]               = useState ( '' );
    const [ messageID, setMessageID ]               = useState ( '' );

    const [ password, setPassword ]                 = useState ( '' );
    const [ passwordCount, setPasswordCount ]       = useState ( 0 );
    const [ envelope, setEnvelope ]                 = useState ( false );
    const [ encoded, setEncoded ]                   = useState ( false );

    const appState      = accountService.appState;

    const onClickEncrypt = async () => {

        const keyPair       = await accountService.getKeyPairAsync ( keyName, password );
        const ciphertext    = keyPair.encrypt ( plaintext, publicHex );

        const envelope = {
            fromPublicHex:      accountService.account.keys [ keyName ].publicKeyHex,
            messageID:          messageID,
            ciphertext:         ciphertext,
        }

        const encoded = Buffer.from ( JSON.stringify ( envelope ), 'utf8' ).toString ( 'base64' );

        setEnvelope ( envelope );
        setEncoded ( encoded );
        setPasswordCount ( passwordCount + 1 );
    }

    const onClosePrivate = () => {
        setEnvelope ( false );
        setEncoded ( false );
        setPassword ( '' );
    }

    const canEncrypt = password && publicHex;

    return (
        <React.Fragment>

            {/******************************************************************
                ENCRYPT MODAL
            ******************************************************************/}
            <UI.Modal
                open
                closeIcon
                size        = 'small'
                onClose     = {() => { onClose ()}}
            >
                <UI.Modal.Header>Encrypt</UI.Modal.Header>
                <UI.Modal.Content>
                    <UI.Form>
                        <UI.Form.Input
                            fluid
                            type            = 'string'
                            placeholder     = "Recipient's Public EC Key (hex)"
                            value           = { publicHex }
                            onChange        = {( event ) => { setPublicHex ( event.target.value ); }}
                            label           = "Recipient's Public EC Key (hex)"
                        />
                        <UI.Form.TextArea
                            rows            = { 8 }
                            placeholder     = 'Plaintext'
                            value           = { plaintext }
                            onChange        = {( event ) => { setPlaintext ( event.target.value ); }}
                            label           = 'Message'
                        />
                        <UI.Form.Input
                            fluid
                            type            = 'string'
                            placeholder     = 'Message ID'
                            value           = { messageID }
                            onChange        = {( event ) => { setMessageID ( event.target.value ); }}
                            label           = 'Message ID (will not be encrypted)'
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
                        disabled    = { !canEncrypt }
                        onClick     = {() => { onClickEncrypt (); }}
                    >
                        Encrypt
                    </UI.Button>
                </UI.Modal.Actions>
            </UI.Modal>

            {/******************************************************************
                PRIVATE MESSAGE MODAL
            ******************************************************************/}
            <UI.Modal
                closeIcon
                size        = 'small'
                onClose     = { onClosePrivate }
                open        = { encoded !== false }
            >
                <UI.Modal.Header>Private Message</UI.Modal.Header>
                <UI.Modal.Content>
                    <UI.Segment>
                        <JSONTree
                            data                = { envelope }
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
                            { encoded }
                        </UI.Segment>
                    </UI.Segment>
                </UI.Modal.Content>
            </UI.Modal>

        </React.Fragment>
    );
});
