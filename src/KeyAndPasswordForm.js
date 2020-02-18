// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AppStateService }                  from './AppStateService';
import { NetworkNavigationBar }             from './NetworkNavigationBar';
import { PasswordInputField }               from './PasswordInputField';
import { assert, crypto, excel, FilePickerMenuItem, hooks, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import { Redirect }                         from 'react-router';
import * as UI                              from 'semantic-ui-react';

//================================================================//
// KeyAndPasswordForm
//================================================================//
export const KeyAndPasswordForm = observer (( props ) => {

    const { appState, setKey, setPassword, generate } = props;

    const [ phraseOrKey, setPhraseOrKey ]       = useState ( '' );
    const [ keyError, setKeyError ]             = useState ( false );

    const onPhraseOrKey = async ( phraseOrKey ) => {

        if ( !phraseOrKey && generate ) {
            phraseOrKey = crypto.generateMnemonic ();
        }

        setKey ( false );
        props.setPhraseOrKey && props.setPhraseOrKey ( '' );
        setPhraseOrKey ( phraseOrKey );

        if ( !phraseOrKey ) {
            setKeyError ( false );
            return;
        }

        try {
            const key = await crypto.loadKeyAsync ( phraseOrKey );
            setKeyError ( false );
            setKey ( key );
            props.setPhraseOrKey && props.setPhraseOrKey ( phraseOrKey );
        }
        catch ( error ) {
            setKeyError ( true );
        }
    }

    const loadFile = ( text ) => {
        onPhraseOrKey ( text )
    }

    if ( !phraseOrKey && generate ) {
        onPhraseOrKey ( crypto.generateMnemonic ());
    }

    return (
        <UI.Form>
            <UI.Menu fluid text>
                <FilePickerMenuItem
                    loadFile = { loadFile }
                    format = 'text'
                    accept = { '.json, .pem' }
                />
            </UI.Menu>

            <UI.Form.TextArea
                placeholder = 'Mnemonic Phrase or Private Key'
                style = {{ fontFamily: 'monospace' }}
                rows = { 8 }
                name = 'phraseOrKey'
                value = { phraseOrKey }
                onChange = {( event ) => { onPhraseOrKey ( event.target.value )}}
                error = { keyError ? 'Invalid Phrase or Key.' : false }
            />

            <PasswordInputField
                appState = { appState }
                setPassword = { setPassword }
            />
        </UI.Form>
    );
});
