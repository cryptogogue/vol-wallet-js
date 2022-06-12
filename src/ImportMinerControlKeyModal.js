// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { PasswordInputField }               from './PasswordInputField';
import { PhraseOrKeyField }                 from './PhraseOrKeyField';
import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import * as UI                              from 'semantic-ui-react';

//================================================================//
// ImportMinerControlKeyModalBody
//================================================================//
const ImportMinerControlKeyModalBody = observer (( props ) => {

    const { accountService, open, onClose } = props;

    const [ key, setKey ]                   = useState ( false );
    const [ phraseOrKey, setPhraseOrKey ]   = useState ( '' );
    const [ password, setPassword ]         = useState ( '' );

    const onSubmit = async () => {
        accountService.affirmMinerControlKey (
            password,
            phraseOrKey,
            key.getPrivateHex (),
            key.getPublicHex ()
        );
        onClose ();
    }

    const submitEnabled = key && phraseOrKey && password;

    return (
        <UI.Modal
            size = 'small'
            closeIcon
            onClose = {() => { onClose ()}}
            open = { open }
        >
            <UI.Modal.Header>Import Miner Control Key</UI.Modal.Header>
            
            <UI.Modal.Content>
                <UI.Form>
                    <PhraseOrKeyField
                        setKey          = { setKey }
                        setPhraseOrKey  = { setPhraseOrKey }
                    />
                    <PasswordInputField
                        appState        = { appState }
                        setPassword     = { setPassword }
                    />
                </UI.Form>
            </UI.Modal.Content>

            <UI.Modal.Actions>
                <UI.Button
                    positive
                    disabled = { !submitEnabled }
                    onClick = {() => { onSubmit ()}}
                >
                    Import
                </UI.Button>
            </UI.Modal.Actions>
        </UI.Modal>
    );
});

//================================================================//
// ImportMinerControlKeyModal
//================================================================//
export const ImportMinerControlKeyModal = observer (( props ) => {

    const { accountService, open } = props;
    const [ counter, setCounter ] = useState ( 0 );

    const onClose = () => {
        setCounter ( counter + 1 );
        props.onClose ();
    }

    return (
        <div key = { counter }>
            <ImportMinerControlKeyModalBody
                accountService      = { accountService }
                open                = { open }
                onClose             = { onClose }
            />
        </div>
    );
});
