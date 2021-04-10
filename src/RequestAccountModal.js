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
// RequestAccountModalBody
//================================================================//
const RequestAccountModalBody = observer (( props ) => {

    const { networkService, open, onClose } = props;

    const [ key, setKey ]                   = useState ( false );
    const [ phraseOrKey, setPhraseOrKey ]   = useState ( '' );
    const [ password, setPassword ]         = useState ( '' );

    const createAccountRequest = () => {
        networkService.setAccountRequest (
            password,
            phraseOrKey,
            key.getKeyID (),
            key.getPrivateHex (),
            key.getPublicHex ()
        );
        onClose ();
    }

    const submitEnabled = key && password;

    return (
        <UI.Modal
            size = 'small'
            closeIcon
            onClose = {() => { onClose ()}}
            open = { open }
        >
            <UI.Modal.Header>Request Account</UI.Modal.Header>
            
            <UI.Modal.Content>
                <KeyAndPasswordForm
                    appState        = { networkService.appState }
                    setKey          = { setKey }
                    setPhraseOrKey  = { setPhraseOrKey }
                    setPassword     = { setPassword }
                    generate
                />
            </UI.Modal.Content>

            <UI.Modal.Actions>
                <UI.Button
                    positive
                    disabled = { !submitEnabled }
                    onClick = {() => { createAccountRequest ()}}
                >
                    Request Account
                </UI.Button>
            </UI.Modal.Actions>
        </UI.Modal>
    );
});

//================================================================//
// RequestAccountModal
//================================================================//
export const RequestAccountModal = observer (( props ) => {

    const { networkService, open } = props;
    const [ counter, setCounter ] = useState ( 0 );

    const onClose = () => {
        setCounter ( counter + 1 );
        props.onClose ();
    }

    return (
        <div key = { counter }>
            <RequestAccountModalBody
                networkService  = { networkService }
                open            = { open }
                onClose         = { onClose }
            />
        </div>
    );
});
