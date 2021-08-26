// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { PasswordInputField }               from './PasswordInputField';
import JSONTree                             from 'react-json-tree';
import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import * as UI                              from 'semantic-ui-react';

//================================================================//
// KeyInfoModalBody
//================================================================//
const KeyInfoModalBody = observer (( props ) => {

    const { accountService, keyName, open, onClose }          = props;
    const [ password, setPassword ]                     = useState ( '' );
    const [ passwordCount, setPasswordCount ]           = useState ( 0 );
    const [ privateKeyInfo, setPrivateKeyInfo ]         = useState ( false );

    const appState      = accountService.appState;
    const key           = accountService.account.keys [ keyName ];

    const onClickShowPrivate = () => {
        setPrivateKeyInfo ( accountService.getPrivateKeyInfo ( keyName, password ));
        setPasswordCount ( passwordCount + 1 );
    }

    const onClosePrivate = () => {
        setPrivateKeyInfo ( false );
        setPassword ( '' );
    }

    return (
        <React.Fragment>

            <UI.Modal
                size = 'small'
                closeIcon
                onClose = {() => { onClose ()}}
                open = { open }
            >
                <UI.Modal.Header>Public Key</UI.Modal.Header>
                
                <UI.Modal.Content>

                    <UI.Header sub>Hexadecimal</UI.Header>
                    <UI.Segment style = {{ wordWrap: 'break-word' }}>{ key.publicKeyHex }</UI.Segment>

                    <UI.Form>
                        <PasswordInputField
                            key             = { passwordCount }
                            appState        = { appState }
                            setPassword     = { setPassword }
                        />
                    </UI.Form>

                </UI.Modal.Content>

                <UI.Modal.Actions>

                    <UI.Button
                        negative
                        disabled = { !password }
                        onClick = { onClickShowPrivate }
                    >
                        Show Private Key
                    </UI.Button>

                    
                </UI.Modal.Actions>

            </UI.Modal>

            <UI.Modal
                size        = 'small'
                closeIcon
                onClose     = { onClosePrivate }
                open        = { privateKeyInfo !== false }
            >
                <UI.Modal.Header>Private Key</UI.Modal.Header>
                <UI.Modal.Content>
                    <UI.Header sub>Hexadecimal</UI.Header>
                    <UI.Segment style = {{ wordWrap: 'break-word' }}>{ privateKeyInfo.privateKeyHex }</UI.Segment>
                    <UI.Header sub>Phrase or Key</UI.Header>
                    <UI.Segment style = {{ wordWrap: 'break-word' }}>{ privateKeyInfo.phraseOrKey }</UI.Segment>
                </UI.Modal.Content>
            </UI.Modal>

        </React.Fragment>
    );
});

//================================================================//
// KeyInfoMessage
//================================================================//
export const KeyInfoMessage = observer (( props ) => {

    const { accountService, keyName } = props;
    const [ open, setOpen ] = useState ( false );
    const [ counter, setCounter ] = useState ( 0 );

    const key = accountService.account.keys [ keyName ];

    const onClose = () => {
        setCounter ( counter + 1 );
        setOpen ( false );
    }

    return (
        <UI.Message
            key = { keyName }
            icon
            positive
        >
            <UI.Icon name = 'key'/>

            <UI.Message.Content>

                <UI.Modal
                    header              = 'Entitlements'
                    trigger             = {<UI.Message.Header style = {{ cursor: 'pointer' }}>{ keyName }</UI.Message.Header>}
                    content             = {
                        <JSONTree
                            hideRoot
                            data = { key.entitlements }
                            theme = 'bright'
                        />
                    }
                />
                
                <p
                    style = {{ cursor: 'pointer' }}
                    onClick = {() => { setOpen ( true )}}
                >
                    { key.publicKeyHex.substr ( 0, 30 ) + "..." }
                </p>

                <KeyInfoModalBody
                    key                 = { counter }
                    accountService      = { accountService }
                    keyName             = { keyName }
                    open                = { open }
                    onClose             = { onClose }
                />

            </UI.Message.Content>

        </UI.Message>
    );
});
