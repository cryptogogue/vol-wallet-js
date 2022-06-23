// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { crypto, FilePickerMenuItem }       from 'fgc';
import { action, computed, observable, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import * as UI                              from 'semantic-ui-react';

//================================================================//
// PhraseOrKeyFieldController
//================================================================//
export class PhraseOrKeyFieldController {

    @observable     phraseOrKey     = '';
    @observable     publicHex       = '';
    @observable     key             = null;
    @observable     error           = '';

    //----------------------------------------------------------------//
    constructor ( generate ) {

        if ( generate ) {
            this.generate = (() => { this.setPhraseOrKey ( crypto.generateMnemonic ()); });
            this.generate ();
        }
    }

    //----------------------------------------------------------------//
    @action
    async setPhraseOrKey ( phraseOrKey ) {

        this.phraseOrKey        = phraseOrKey;
        this.publicHex          = '';
        this.key                = null;
        this.error              = '';

        if ( phraseOrKey ) {

            let key     = null;
            let error   = 'Invalid phrase or key.';

            try {
                key     = await crypto.loadKeyAsync ( phraseOrKey );
                error   = '';
            }
            catch ( error ) {
            }

            runInAction (() => {
                this.key        = key;
                this.error      = error;
            });
        }
    }
}

//================================================================//
// PhraseOrKeyField
//================================================================//
export const PhraseOrKeyField = observer (( props ) => {

    const { controller } = props;

    return (
        <UI.Form.Field>
            <UI.Menu attached = 'top'>
                <FilePickerMenuItem
                    loadFile = {( text ) => { controller.setPhraseOrKey ( text ); }}
                    format = 'text'
                    accept = { '.json, .pem' }
                />
                <If condition = { controller.generate }>
                    <UI.Menu.Menu position = 'right'>
                        <UI.Menu.Item
                            icon        = 'refresh'
                            onClick     = { controller.generate }
                        /> 
                    </UI.Menu.Menu>
                </If>
            </UI.Menu>
            <UI.Segment secondary attached = 'bottom'>
                <UI.Form.TextArea
                    label           = 'Mnemonic Phrase or EC Private Key'
                    placeholder     = 'Mnemonic Phrase or EC Private Key'
                    style           = {{ fontFamily: 'monospace' }}
                    rows            = { 8 }
                    name            = 'phraseOrKey'
                    value           = { controller.phraseOrKey }
                    onChange        = {( event ) => { controller.setPhraseOrKey ( event.target.value )}}
                    error           = { controller.error || false }
                />

                <UI.Form.Input
                    label           = 'Public EC Key (hex)'
                    fluid
                    readOnly
                    style           = {{ fontFamily: 'monospace' }}
                    type            = 'string'
                    placeholder     = 'Public Hex'
                    value           = { controller.publicHex }
                />
            </UI.Segment>
        </UI.Form.Field>
    );
});
