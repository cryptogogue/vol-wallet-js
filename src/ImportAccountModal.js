// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AppStateService }                  from './AppStateService';
import { KeyAndPasswordForm }               from './KeyAndPasswordForm';
import { NetworkNavigationBar }             from './NetworkNavigationBar';
import { assert, crypto, excel, FilePickerMenuItem, hooks, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import { Redirect }                         from 'react-router';
import * as UI                              from 'semantic-ui-react';

// https://www.npmjs.com/package/js-crypto-utils

const STATUS_WAITING_FOR_INPUT          = 0;
const STATUS_VERIFYING_KEY              = 1;
const STATUS_DONE                       = 2;

//================================================================//
// ImportAccountController
//================================================================//
class ImportAccountController {

    @observable accountID       = '';
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

        const publicKey = key.getPublicHex ();
        console.log ( 'PUBLIC_KEY', publicKey );

        // check to see if we already have the key, in which case early out
        let accountID = appState.findAccountIdByPublicKey ( publicKey );

        if ( accountID ) {
            this.accountID = accountID;
            this.status = STATUS_DONE;
            return;
        }

        const keyID = key.getKeyID ();
        console.log ( 'KEY_ID', keyID );

        this.status = STATUS_VERIFYING_KEY;

        let keyName = false;

        try {

            const data = await this.revocable.fetchJSON ( `${ appState.network.nodeURL }/keys/${ keyID }` );

            const keyInfo = data && data.keyInfo;

            if ( keyInfo ) {
                accountID = keyInfo.accountName;
                keyName = keyInfo.keyName;
            }
        }
        catch ( error ) {
            console.log ( error );
        }

        runInAction (() => {
            if ( accountID ) {

                console.log ( 'PHRASE OR KEY:', phraseOrKey );

                const privateKey = key.getPrivateHex ();
                appState.affirmAccountAndKey (
                    password,
                    accountID,
                    keyName,
                    phraseOrKey,
                    privateKey,
                    publicKey
                );

                this.accountID = accountID;
                this.status = STATUS_DONE;
            }
            else {
                this.status = STATUS_WAITING_FOR_INPUT;
            }
        });
    }
}

//================================================================//
// ImportAccountModalBody
//================================================================//
const ImportAccountModalBody = observer (( props ) => {

    const { appState, open, onClose } = props;

    const controller = hooks.useFinalizable (() => new ImportAccountController ( appState ));

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
            <UI.Modal.Header>Import Account</UI.Modal.Header>
            
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
// ImportAccountModal
//================================================================//
export const ImportAccountModal = observer (( props ) => {

    const { appState, open } = props;
    const [ counter, setCounter ] = useState ( 0 );

    const onClose = () => {
        setCounter ( counter + 1 );
        props.onClose ();
    }

    return (
        <div key = { counter }>
            <ImportAccountModalBody
                appState    = { appState }
                open        = { open }
                onClose     = { onClose }
            />
        </div>
    );
});
