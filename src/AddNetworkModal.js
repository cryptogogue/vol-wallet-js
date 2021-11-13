// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { hooks }                    from 'fgc';
import React, { useState }          from 'react';
import { runInAction }              from 'mobx';
import { observer }                 from 'mobx-react';
import * as UI                      from 'semantic-ui-react';
import url                          from 'url';
import validator                    from 'validator';
import * as vol                     from 'vol';

const NETWORK_NAME_REGEX     = /^[a-z0-9]+[a-z0-9-]*$/;

const NODE_INFO_STATE = {
    IDLE:   'IDLE',
    BUSY:   'BUSY',
    DONE:   'DONE',
    ERROR:  'ERROR',
};

//================================================================//
// AddNetworkModalBody
//================================================================//
export const AddNetworkModalBody = observer (( props ) => {

    const { appState, open, onClose } = props;
    const [ state, setState ]                   = useState ( NODE_INFO_STATE.IDLE );
    const [ name, setName ]                     = useState ( '' );
    const [ nameError, setNameError ]           = useState ( '' );
    const [ nodeURL, setNodeURL ]               = useState ( '' );
    const [ testURL, setTestURL ]               = useState ( '' );
    const [ suggestName, setSuggestName ]       = useState ( false );

    const consensusService  = hooks.useFinalizable (() => new vol.ConsensusService ());

    let onChangeName = ( value ) => {

        setName ( value );
        setSuggestName ( false );

        let err = '';
        if ( value && !NETWORK_NAME_REGEX.test ( value )) {
            err = `Network names must start with a [a-z] or [0-9] and contain only [a-z], [0-9] and '-'.`
        }

        if ( appState.networkIDs.includes ( value )) {
            err = `Network named ${ value } already exists.`
        }
        setNameError ( err );
    }

    let onChangeNodeURL = ( inputURL ) => {

        consensusService.reset ();
        setState ( NODE_INFO_STATE.IDLE );
        setNodeURL ( inputURL );

        if ( validator.isURL ( inputURL, { protocols: [ 'http', 'https' ], require_protocol: true, require_tld: false })) {
            inputURL = url.format ( url.parse ( inputURL ));
            setTestURL ( inputURL );
        }
    }

    let onCheckNodeURL = async () => {

        setState ( NODE_INFO_STATE.BUSY );
        const error = await consensusService.initializeWithNodeURLAsync ( testURL );

        if ( error ) {
            setState ( NODE_INFO_STATE.ERROR );
        }
        else {
            setState ( NODE_INFO_STATE.DONE );
        }

        setState ( error ? NODE_INFO_STATE.ERROR : NODE_INFO_STATE.DONE );

        if ( !name ) {
            setSuggestName ( true );
        }
    }

    let onSubmit = () => {
        appState.affirmNetwork ( name, consensusService );
        runInAction (() => {
            appState.flags.promptFirstNetwork = false;
        });
        onClose ();
    }

    const isBusy        = state === NODE_INFO_STATE.BUSY;
    const nodeURLError  = state === NODE_INFO_STATE.ERROR && 'Error fetching node info.';
    const isNode        = state === NODE_INFO_STATE.DONE && consensusService.genesis !== false;

    if ( !name && suggestName && isNode ) {
        const defaultName = consensusService.identity.toLowerCase ().replace ( /[^a-z0-9]+/g, '-' );
        onChangeName ( defaultName );
    }

    const submitEnabled     = isNode && name && !nameError;
    const testEnabled       = Boolean ( testURL );
    const genesis           = consensusService.genesis;

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
                    <When condition = { isNode }>

                        <UI.Message icon positive>
                            <UI.Icon name = 'sitemap'/>
                            <UI.Message.Content>
                                <UI.Message.Header>{ consensusService.identity }</UI.Message.Header>
                                <p style = {{ padding: 0, margin: 0 }}>{ genesis }</p>
                                <p style = {{ padding: 0, margin: 0 }}>Mining network is online.</p>
                                <p style = {{ padding: 0, margin: 0 }}>Miners: { consensusService.onlineMiners.length }</p>
                                <p style = {{ padding: 0, margin: 0 }}>Height: { consensusService.height }</p>
                            </UI.Message.Content>
                        </UI.Message>

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

                    <When condition = { state === NODE_INFO_STATE.DONE }>
                        <UI.Message
                            negative
                            icon = 'question circle'
                            header = 'UNKNOWN'
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
