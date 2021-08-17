// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                                          from './fields/fields'
import { NavigationBar }                                    from './NavigationBar';
import { AppStateService }                                  from './services/AppStateService';
import { Transaction, TRANSACTION_TYPE }                    from './transactions/Transaction';
import { TransactionDropdown }                              from './transactions/TransactionDropdown';
import { TransactionForm }                                  from './transactions/TransactionForm';
import * as controllers                                     from './transactions/TransactionFormController';
import _                                                    from 'lodash';
import { assert, ClipboardMenuItem, excel, FilePickerMenuItem, hooks, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import { action, computed, extendObservable, observable }   from "mobx";
import { observer }                                         from 'mobx-react';
import React, { Fragment, useState, useRef }                from 'react';
import JSONTree                                             from 'react-json-tree';
import { Link }                                             from 'react-router-dom';
import * as UI                                              from 'semantic-ui-react';

//================================================================//
// MinerInfoFormController
//================================================================//
export class MinerInfoFormController extends Fields.FormController {

    @observable minerInfo = false;

    //----------------------------------------------------------------//
    constructor ( appState ) {
        super ();

        const fieldsArray = [
            new Fields.StringFieldController        ( 'motto',          'Motto',            '' ),
            new Fields.StringFieldController        ( 'url',            'Miner URL' ),
            new Fields.CryptoKeyFieldController     ( 'key',            'RSA Key' ),
        ];
        this.initialize ( appState, fieldsArray );
    }

    //----------------------------------------------------------------//
    finalize () {
    }

    //----------------------------------------------------------------//
    @action
    virtual_compute () {

        const motto     = this.fields.motto.value || '';
        const key       = this.fields.key.key;
        const visage    = key.sign ( motto );

        this.minerInfo = {
            url:        this.fields.url.value,
            key:        key.getPublic ( 'json' ),
            motto:      motto,
            visage:     visage,
        }
    }

    //----------------------------------------------------------------//
    @action
    virtual_validate () {

        const key = this.fields.key.key || false;

        if ( key ) {
            if ( key.type !== 'RSA' ) {
                this.fields.key.error = 'Not an RSA key.';
            }
        }
    }
}

//================================================================//
// MinerInfoUtilScreen
//================================================================//
export const MinerInfoUtilScreen = observer (( props ) => {

    const formController            = hooks.useFinalizable (() => new MinerInfoFormController ( appState ));

    const [ json, setJSON ]         = useState ( '' );

    const onShowJSON = () => {
        setJSON ( JSON.stringify ( formController.minerInfo, null, 4 ));
    }

    const isEnabled = formController.isCompleteAndErrorFree;

    return (
        <SingleColumnContainerView>

            <NavigationBar appState = { appState }/>

            <UI.Segment attached = 'bottom'>
            
                <UI.Form>
                    <Fields.StringField     field = { formController.fields.motto }/>
                    <Fields.StringField     field = { formController.fields.url }/>
                    <Fields.CryptoKeyField  field = { formController.fields.key }/>
                </UI.Form>
                
            </UI.Segment>

            <UI.Segment attached = 'top'>
                <UI.Button fluid color = 'teal' disabled = { !isEnabled } onClick = {() => { onShowJSON ()}}>
                    Miner Info
                </UI.Button>
            </UI.Segment>

            <UI.Modal
                size = 'large'
                closeIcon
                onClose = {() => { setJSON ( '' )}}
                open = { Boolean ( json )}
            >
                <UI.Modal.Header>Miner Info</UI.Modal.Header>

                <UI.Modal.Content>
                    <UI.Form>

                        <UI.Menu attached = 'top'>
                            <UI.Menu.Menu position = "right">
                                <ClipboardMenuItem
                                    value = { json ? json : false }
                                />
                            </UI.Menu.Menu>
                        </UI.Menu>

                        <UI.Segment attached = 'bottom'>
                            <UI.Form.TextArea
                                readOnly
                                attached        = 'bottom'
                                style           = {{ fontFamily: 'monospace' }}
                                rows            = { 32 }
                                value           = { json }
                            />
                        </UI.Segment>
                    </UI.Form>
                </UI.Modal.Content>
            </UI.Modal>

        </SingleColumnContainerView>
    );
});
