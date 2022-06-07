// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { PasswordInputField }               from './PasswordInputField';
import JSONTree                             from 'react-json-tree';
import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import * as UI                              from 'semantic-ui-react';

//================================================================//
// SignWitKeyModal
//================================================================//
export const SignWithKeyModal = observer (( props ) => {

    const { accountService, keyName, onClose }      = props;
    const [ encoded, setEncoded ]                   = useState ( '' );
    const [ password, setPassword ]                 = useState ( '' );
    const [ passwordCount, setPasswordCount ]       = useState ( 0 );

    const [ msgEnvelope, setMsgEnvelope ]           = useState ( false );
    const [ plaintext, setPlaintext ]               = useState ( '' );

    const [ sigEnvelope, setSigEnvelope ]           = useState ( false );
    const [ sigEncoded, setSigEncoded ]             = useState ( false );

    const [ error, setError ]                       = useState ( false );

    const appState      = accountService.appState;
    const key           = accountService.account.keys [ keyName ];

    const onChange = async ( event ) => {
        setPlaintext ( event.target.value );
        setError ( false );
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

    const canSign = password && Boolean(plaintext);

    return (
        <React.Fragment>

            {/******************************************************************
                SIGN MODAL
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
                            label           = 'String to sign'
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
                        disabled    = { !canSign }
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
                onClose     = { onClose }
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
