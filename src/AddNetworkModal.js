// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { assert, excel, hooks, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import React, { useState }          from 'react';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                 from 'mobx-react';
import * as UI                      from 'semantic-ui-react';
import validator                    from 'validator';

const NETWORK_NAME_REGEX     = /^[a-z0-9]+[a-z0-9-]*$/;

const NODE_INFO_STATE = {
    IDLE:   'IDLE',
    BUSY:   'BUSY',
    DONE:   'DONE',
    ERROR:  'ERROR',
};

//================================================================//
// NodeInfoService
//================================================================//
export class NodeInfoService {

    //----------------------------------------------------------------//
    constructor () {
        
        this.revocable      = new RevocableContext ();

        extendObservable ( this, {
            info:           false,
            state:          NODE_INFO_STATE.IDLE,
        });
    }

    //----------------------------------------------------------------//
    @action
    fetchNodeInfo ( url ) {

        this.info = false;
        this.state = NODE_INFO_STATE.BUSY;

        const doUpdate = async () => {
            try {
                const info = await this.revocable.fetchJSON ( url );
                runInAction (() => {
                    this.info = info;
                    this.state = NODE_INFO_STATE.DONE;
                });
            }
            catch ( error ) {
                console.log ( error );
                runInAction (() => {
                    this.state = NODE_INFO_STATE.ERROR;
                });
            }
        }
        doUpdate ();
    }

    //----------------------------------------------------------------//
    finalize () {

        this.revocable.finalize ();
    }

    //----------------------------------------------------------------//
    @action
    reset () {

        this.info = false;
        this.state = NODE_INFO_STATE.IDLE;
    }
}

//================================================================//
// AddNetworkModalBody
//================================================================//
export const AddNetworkModalBody = observer (( props ) => {

    const { appState, open, onClose } = props;
    const [ name, setName ]                     = useState ( '' );
    const [ nameError, setNameError ]           = useState ( '' );
    const [ nodeURL, setNodeURL ]               = useState ( '' );
    const [ testURL, setTestURL ]               = useState ( '' );
    const [ suggestName, setSuggestName ]       = useState ( false );

    const controller    = hooks.useFinalizable (() => new NodeInfoService ());

    let onChangeName = ( value ) => {

        setName ( value );
        setSuggestName ( false );

        let err = '';
        if ( value && !NETWORK_NAME_REGEX.test ( value )) {
            err = `Network names must start with a [a-z] or [0-9] and contain only [a-z], [0-9] and '-'.`
        }

        if ( appState.getNetwork ( value )) {
            err = `Network named ${ value } already exists.`
        }
        setNameError ( err );
    }

    let onChangeNodeURL = ( url ) => {

        controller.reset ();
        setNodeURL ( url );

        if ( validator.isURL ( url, { protocols: [ 'http', 'https' ], require_protocol: true, require_tld: false })) {
            url = url.replace ( /\/+$/, '' );
            setTestURL ( url );
        }
    }

    let onCheckNodeURL = () => {
        controller.fetchNodeInfo ( testURL );
        if ( !name ) {
            setSuggestName ( true );
        }
    }

    let onSubmit = () => {
        appState.affirmNetwork ( name, controller.info.identity, testURL )
        onClose ();
    }

    const isBusy = controller.state === NODE_INFO_STATE.BUSY;
    const nodeURLError = controller.state === NODE_INFO_STATE.ERROR && 'Error fetching node info.';
    const nodeType = controller.state === NODE_INFO_STATE.DONE && controller.info && controller.info.type;

    if ( !name && suggestName && ( nodeType === 'VOL_MINING_NODE' )) {
        const defaultName = controller.info.identity.toLowerCase ().replace ( /[^a-z0-9]+/g, '-' );
        onChangeName ( defaultName );
    }

    const submitEnabled = name && !nameError && ( nodeType === 'VOL_MINING_NODE' );
    const testEnabled = Boolean ( testURL );

    return (
        <UI.Modal
            size = 'small'
            closeIcon
            onClose = {() => { onClose ()}}
            open = { open }
        >
            <UI.Modal.Header>Add Network</UI.Modal.Header>

            <UI.Modal.Content>
                <UI.Form>
                    <p><span>Enter the URL of a Volition mining node then press </span><UI.Icon name = 'sync alternate'/><span>to sync:</span></p>
                    <UI.Form.Field>
                        <UI.Input
                            fluid
                            loading = { isBusy }
                            action = {
                                <If condition = { !isBusy }>
                                    <UI.Button
                                        icon = 'sync alternate'
                                        color = { testEnabled ? 'green' : 'grey' }
                                        disabled = { !testEnabled }
                                        onClick = { onCheckNodeURL }
                                    />
                                </If>
                            }
                            placeholder     = "Node URL"
                            name            = "nodeURL"
                            type            = "url"
                            value           = { nodeURL }
                            onChange        = {( event ) => { onChangeNodeURL ( event.target.value )}}
                        />
                        { nodeURLError && <UI.Label pointing prompt>{ nodeURLError }</UI.Label> }
                    </UI.Form.Field>
                </UI.Form>

                <Choose>
                    <When condition = { nodeType === 'VOL_MINING_NODE' }>
                        <UI.Message
                            positive
                            icon = 'sitemap'
                            header = { controller.info.identity }
                            content = 'Mining network is online.'
                        />

                        <UI.Form>
                            <p>Enter a local nickname for this mining network:</p>
                            <UI.Form.Field>
                                <UI.Input
                                    fluid
                                    placeholder = "Network Name"
                                    disabled = { isBusy }
                                    type = "text"
                                    value = { name }
                                    onChange = {( event ) => { onChangeName ( event.target.value )}}
                                />
                                { nameError && <UI.Label pointing prompt>{ nameError }</UI.Label> }
                            </UI.Form.Field>

                        </UI.Form>
                    </When>

                    <When condition = { controller.state === NODE_INFO_STATE.DONE }>
                        <UI.Message
                            negative
                            icon = 'question circle'
                            header = { UNKNOWN }
                            content = 'Not a mining node.'
                        />
                    </When>
                </Choose>

            </UI.Modal.Content>

            <UI.Modal.Actions>
                <UI.Button
                    positive
                    disabled = { !submitEnabled }
                    onClick = { onSubmit }>
                    Save
                </UI.Button>
            </UI.Modal.Actions>
        </UI.Modal>
    );
});

//================================================================//
// AddNetworkModal
//================================================================//
export const AddNetworkModal = observer (( props ) => {

    const { appState, open } = props;
    const [ counter, setCounter ] = useState ( 0 );

    const onClose = () => {
        setCounter ( counter + 1 );
        props.onClose ();
    }

    return (
        <AddNetworkModalBody
            key         = { counter }
            appState    = { appState }
            open        = { open }
            onClose     = { onClose }
        />
    );
});
