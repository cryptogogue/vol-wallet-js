// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { DecryptAndSignWithKeyModal }       from './DecryptAndSignWithKeyModal';
import { EncryptWithKeyModal }              from './EncryptWithKeyModal';
import { PasswordInputField }               from './PasswordInputField';
import JSONTree                             from 'react-json-tree';
import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import * as UI                              from 'semantic-ui-react';

const MODALS = {
    ENCRYPT:            'ENCRYPT',
    DECRYPT_AND_SIGN:   'DECRYPT_AND_SIGN',
    EXPORT:             'EXPORT',
    ENTITLEMENTS:       'ENTITLEMENTS',
};

//================================================================//
// ExportKeyModal
//================================================================//
const ExportKeyModal = observer (( props ) => {

    const { accountService, keyName, onClose }      = props;
    const [ password, setPassword ]                 = useState ( '' );
    const [ passwordCount, setPasswordCount ]       = useState ( 0 );
    const [ privateKeyInfo, setPrivateKeyInfo ]     = useState ( false );

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
                open
                closeIcon
                size        = 'small'
                onClose     = {() => { onClose ()}}
            >
                <UI.Modal.Header>Public Key</UI.Modal.Header>
                
                <UI.Modal.Content>
                    <UI.Header sub>Hexadecimal</UI.Header>
                    <UI.Segment style = {{ wordBreak: 'break-all', wordWrap: 'break-word', overflowWrap: 'break-word' }}>{ key.publicKeyHex }</UI.Segment>
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
                        disabled    = { !password }
                        onClick     = { onClickShowPrivate }
                    >
                        Show Private Key
                    </UI.Button>
                </UI.Modal.Actions>

            </UI.Modal>

            <UI.Modal
                closeIcon
                size        = 'small'
                onClose     = { onClosePrivate }
                open        = { privateKeyInfo !== false }
            >
                <UI.Modal.Header>Private Key</UI.Modal.Header>
                <UI.Modal.Content>
                    <UI.Header sub>Hexadecimal</UI.Header>
                    <UI.Segment style = {{ wordBreak: 'break-all', wordWrap: 'break-word', overflowWrap: 'break-word' }}>{ privateKeyInfo.privateKeyHex }</UI.Segment>
                    <UI.Header sub>Phrase or Key</UI.Header>
                    <UI.Segment style = {{ wordBreak: 'break-all', wordWrap: 'break-word', overflowWrap: 'break-word' }}>{ privateKeyInfo.phraseOrKey }</UI.Segment>
                </UI.Modal.Content>
            </UI.Modal>

        </React.Fragment>
    );
});

//================================================================//
// KeyEntitlementsModal
//================================================================//
const KeyEntitlementsModal = observer (( props ) => {

    const { accountService, keyName, onClose } = props;
    const key = accountService.account.keys [ keyName ];

    return (
        <UI.Modal
            open
            closeIcon
            size        = 'small'
            onClose     = {() => { onClose ()}}
        >
            <UI.Modal.Header>Entitlements</UI.Modal.Header>
            <UI.Modal.Content>
                <JSONTree
                    hideRoot
                    data                = { key.entitlements }
                    theme               = 'bright'
                    shouldExpandNode    = {() => { return true; }}
                />
            </UI.Modal.Content>
        </UI.Modal>
    );
});

//================================================================//
// KeyInfoMessage
//================================================================//
export const KeyInfoMessage = observer (( props ) => {

    const { accountService, keyName }       = props;
    const [ modal, setModal ]               = useState ( false );

    const key = accountService.account.keys [ keyName ];

    const onClose = () => {
        setModal ( false );
    }

    return (
        <React.Fragment>

            <Choose>

                <When condition = {( modal === MODALS.ENCRYPT )}>
                    <EncryptWithKeyModal
                        accountService      = { accountService }
                        keyName             = { keyName }
                        onClose             = { onClose }
                    />
                </When>

                <When condition = {( modal === MODALS.DECRYPT_AND_SIGN )}>
                    <DecryptAndSignWithKeyModal
                        accountService      = { accountService }
                        keyName             = { keyName }
                        onClose             = { onClose }
                    />
                </When>

                <When condition = {( modal === MODALS.EXPORT )}>
                    <ExportKeyModal
                        accountService      = { accountService }
                        keyName             = { keyName }
                        onClose             = { onClose }
                    />
                </When>

                <When condition = {( modal === MODALS.ENTITLEMENTS )}>
                    <KeyEntitlementsModal
                        accountService      = { accountService }
                        keyName             = { keyName }
                        onClose             = { onClose }
                    />
                </When>
            </Choose>

            <UI.Message
                key         = { keyName }
                attached    = 'top'
                icon
                positive
            >
                <UI.Icon name = 'key'/>
                <UI.Message.Content>
                    <UI.Message.Header>{ keyName }</UI.Message.Header>
                    <div style = {{
                        wordBreak: 'break-all',
                        wordWrap: 'break-word',
                        overflowWrap: 'break-word',
                    }}>
                        { key.publicKeyHex }
                    </div>
                </UI.Message.Content>
            </UI.Message>

            <UI.Segment attached = 'bottom'>
                <UI.Dropdown
                    fluid
                    selection
                    text            = 'Tools'
                >
                    <UI.Dropdown.Menu>
                        <UI.Dropdown.Item icon = 'envelope'     text = 'Encrypt'            onClick = {() => { setModal ( MODALS.ENCRYPT ); }}/>
                        <UI.Dropdown.Item icon = 'signup'       text = 'Decrypt & Sign'     onClick = {() => { setModal ( MODALS.DECRYPT_AND_SIGN ); }}/>
                        <UI.Dropdown.Item icon = 'unlock'       text = 'Export'             onClick = {() => { setModal ( MODALS.EXPORT ); }}/>
                        <UI.Dropdown.Item icon = 'shield'       text = 'Entitlements'       onClick = {() => { setModal ( MODALS.ENTITLEMENTS ); }}/>
                    </UI.Dropdown.Menu>
                </UI.Dropdown>
            </UI.Segment>

        </React.Fragment>
    );
});
