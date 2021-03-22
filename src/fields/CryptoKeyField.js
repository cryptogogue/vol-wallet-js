// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { ScannerReportMessages, SchemaScannerXLSX } from 'cardmotron';
import { assert, crypto, excel, hooks, FilePickerMenuItem, util } from 'fgc';
import JSONTree                             from 'react-json-tree';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import * as UI                              from 'semantic-ui-react';

//================================================================//
// CryptoKeyField
//================================================================//
export const CryptoKeyField = observer (( props ) => {

    const { field } = props;

    const errorMsg      = field.error || '';
    const hasError      = ( errorMsg.length > 0 );

    const onPhraseOrKey = async ( phraseOrKey ) => {

        field.setInputString ( phraseOrKey );
        field.setKey ( false );

        if ( !phraseOrKey ) return;

        try {
            const key = await crypto.loadKeyAsync ( phraseOrKey );
            field.setKey ( key );
        }
        catch ( error ) {
            field.setError ( 'Invalid Phrase or Key.' );
        }
    }

    const loadFile = ( text ) => {
        onPhraseOrKey ( text )
    }

    return (
        <React.Fragment>
            <UI.Menu attached = 'top'>
                <FilePickerMenuItem
                    loadFile = { loadFile }
                    format = 'text'
                    accept = { '.json, .pem' }
                />
            </UI.Menu>

            <UI.Segment attached = 'bottom'>
                 <UI.Form.TextArea
                    attached        = 'bottom'
                    style           = {{ fontFamily: 'monospace' }}
                    rows            = { field.rows || 8 }
                    placeholder     = { field.friendlyName || 'Mnemonic Phrase or Private Key' }
                    name            = { field.fieldName }
                    value           = { field.inputString }
                    onChange        = {( event ) => { onPhraseOrKey ( event.target.value )}}
                    error           = { hasError ? errorMsg : false }
                />
            </UI.Segment>
        </React.Fragment>
    );
});
