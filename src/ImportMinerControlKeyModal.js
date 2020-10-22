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

// TODO: consolidate with ImportAccountModal - it's essentiall the same interface

const STATUS_WAITING_FOR_INPUT          = 0;
const STATUS_VERIFYING_KEY              = 1;
const STATUS_DONE                       = 2;

//================================================================//
// ImportMinerControlKeyController
//================================================================//
class ImportMinerControlKeyController {

    @observable status          = STATUS_WAITING_FOR_INPUT;

    //----------------------------------------------------------------//
    constructor ( appState ) {

        this.revocable  = new RevocableContext ();
    }

    //----------------------------------------------------------------//
    finalize () {

        this.revocable.finalize ();
    }

    //----------------------------------------------------------------//
    @action
    async import ( appState, key, phraseOrKey, password ) {

        this.status = STATUS_VERIFYING_KEY;

        runInAction (() => {

            appState.affirmMinerControlKey (
                password,
                phraseOrKey,
                key.getPrivateHex (),
                key.getPublicHex ()
            );

            this.status = STATUS_DONE;
        });
    }
}

//================================================================//
// ImportMinerControlKeyModalBody
//================================================================//
const ImportMinerControlKeyModalBody = observer (( props ) => {

    const { appState, open, onClose } = props;

    const controller = hooks.useFinalizable (() => new ImportMinerControlKeyController ( appState ));

    const [ key, setKey ]                   = useState ( false );
    const [ phraseOrKey, setPhraseOrKey ]   = useState ( '' );
    const [ password, setPassword ]         = useState ( '' );

    const onSubmit = async () => {
        console.log ( 'PHRASE OR KEY:', phraseOrKey );
        controller.import ( appState, key, phraseOrKey, password );
    }

    if ( controller.status === STATUS_DONE ) {
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
                    appState        = { appState }
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

    const { appState, open } = props;
    const [ counter, setCounter ] = useState ( 0 );

    const onClose = () => {
        setCounter ( counter + 1 );
        props.onClose ();
    }

    return (
        <div key = { counter }>
            <ImportMinerControlKeyModalBody
                appState    = { appState }
                open        = { open }
                onClose     = { onClose }
            />
        </div>
    );
});
