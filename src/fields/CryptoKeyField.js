// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { FilePickerMenuItem }               from 'fgc';
import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import * as UI                              from 'semantic-ui-react';

//================================================================//
// CryptoKeyField
//================================================================//
export const CryptoKeyField = observer (( props ) => {

    const { field } = props;

    const [ phraseOrKey, setPhraseOrKey ] = useState ( '' );

    const errorMsg      = field.error || '';
    const hasError      = ( errorMsg.length > 0 );

    const loadPhraseOrKey = ( text ) => {
        setPhraseOrKey ( text );
        field.loadKeyAsync ( text );
    }

    const onBlur = () => {
        loadPhraseOrKey ( phraseOrKey );
    };

    return (
        <React.Fragment>
            <UI.Menu attached = 'top'>
                <FilePickerMenuItem
                    loadFile        = { loadPhraseOrKey }
                    format          = 'text'
                    accept          = { '.json, .pem' }
                />
            </UI.Menu>

            <UI.Segment attached = 'bottom'>
                 <UI.Form.TextArea
                    attached        = 'bottom'
                    style           = {{ fontFamily: 'monospace' }}
                    rows            = { field.rows || 8 }
                    placeholder     = { props.placeholder || 'Mnemonic Phrase or Private Key' }
                    name            = { field.fieldName }
                    value           = { field.phraseOrKey }
                    onChange        = {( event ) => { setPhraseOrKey ( event.target.value )}}
                    onBlur          = { onBlur }
                    error           = { hasError ? errorMsg : false }
                />
            </UI.Segment>
        </React.Fragment>
    );
});
