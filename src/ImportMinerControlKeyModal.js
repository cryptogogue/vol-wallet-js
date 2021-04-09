// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { KeyAndPasswordForm }               from './KeyAndPasswordForm';
import { NetworkNavigationBar }             from './NetworkNavigationBar';
import { AppStateService }                  from './services/AppStateService';
import { assert, crypto, excel, FilePickerMenuItem, hooks, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import { Redirect }                         from 'react-router';
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
                <KeyAndPasswordForm
                    appState        = { accountService.appState }
                    setKey          = { setKey }
                    setPhraseOrKey  = { setPhraseOrKey }
                    setPassword     = { setPassword }
                />
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
