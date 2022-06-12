// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { PasswordInputField }               from './PasswordInputField';
import { PhraseOrKeyField }                 from './PhraseOrKeyField';
import { hooks, RevocableContext }          from 'fgc';
import { action, observable, runInAction }  from 'mobx';
import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import * as UI                              from 'semantic-ui-react';

// https://www.npmjs.com/package/js-crypto-utils

//const debugLog = function () {}
const debugLog = function ( ...args ) { console.log ( '@IMPORT ACCOUNT:', ...args ); }

//================================================================//
// ImportAccountController
//================================================================//
class ImportAccountController {

    @observable accountID       = '';

    //----------------------------------------------------------------//
    constructor ( networkService ) {

        this.revocable          = new RevocableContext ();
        this.networkService     = networkService;
    }

    //----------------------------------------------------------------//
    @action
    async importAsync ( key, phraseOrKey, password ) {

        debugLog ( 'IMPORT' )

        const publicKey = key.getPublicHex ();
        console.log ( 'PUBLIC_KEY', publicKey );

        // check to see if we already have the key, in which case early out
        let accountID = this.networkService.findAccountIdByPublicKey ( publicKey );

        if ( accountID ) {

            debugLog ( 'ALREADY EXISTS:', accountID )

            this.accountID = accountID;
            return;
        }

        const keyID = key.getKeyID ();
        console.log ( 'KEY_ID', keyID );

        let keyName = false;
        let accountIndex = false;

        try {

            const data = await this.revocable.fetchJSON ( this.networkService.getServiceURL ( `/keys/${ keyID }`, {}, true ));

            debugLog ( 'LOOKUP BY KEY:', data )

            const keyInfo = data && data.keyInfo;

            if ( keyInfo ) {
                accountID       = keyInfo.accountName;
                accountIndex    = keyInfo.accountIndex;
                keyName         = keyInfo.keyName;
            }
        }
        catch ( error ) {
            console.log ( error );
        }

        runInAction (() => {
            if ( accountID ) {

                console.log ( 'PHRASE OR KEY:', phraseOrKey );

                const privateKey = key.getPrivateHex ();
                this.networkService.affirmAccountAndKey (
                    password,
                    accountIndex,
                    accountID,
                    keyName,
                    phraseOrKey,
                    privateKey,
                    publicKey
                );

                this.accountID = accountID;
                this.networkService.appState.flags.promptFirstAccount = false;
            }
        });
    }
}

//================================================================//
// ImportAccountModal
//================================================================//
export const ImportAccountModal = observer (( props ) => {

    const { networkService, onClose } = props;

    const controller = hooks.useFinalizable (() => new ImportAccountController ( networkService, onClose ));
    const appState = networkService.appState;

    const [ key, setKey ]                   = useState ( false );
    const [ phraseOrKey, setPhraseOrKey ]   = useState ( '' );
    const [ password, setPassword ]         = useState ( '' );
    const [ busy, setBusy ]                 = useState ( false );

    const onSubmit = async () => {
        setBusy ( true );
        await controller.importAsync ( key, phraseOrKey, password );
        if ( controller.accountID ) {
            onClose ();
        }
        else {
            setBusy ( false );
        }
    }

    const submitEnabled = key && phraseOrKey && password;

    return (
        <UI.Modal
            open
            size        = 'small'
            closeIcon
            onClose     = {() => { onClose ()}}
        >
            <UI.Modal.Header>Import Account</UI.Modal.Header>
            
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
                    disabled        = { !submitEnabled }
                    onClick         = {() => { onSubmit ()}}
                    loading         = { busy }
                >
                    Import
                </UI.Button>
            </UI.Modal.Actions>
        </UI.Modal>
    );
});
