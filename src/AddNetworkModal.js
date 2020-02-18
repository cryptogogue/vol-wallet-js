// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { assert, excel, hooks, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import React, { useState }          from 'react';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                 from 'mobx-react';
import { Button, Divider, Form, Header, Icon, Input, Label, Message, Modal, Popup, Segment } from 'semantic-ui-react';

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
                    console.log ( 'GOT INFO:', info );
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
    };

    let onChangeNodeURL = ( url ) => {

        controller.reset ();
        setNodeURL ( url );

        if ( url ) {
            url = url.toLowerCase ();
            if ( url.startsWith ( 'http://' ) || url.startsWith ( 'https://' )) {
                setTestURL ( url.replace ( /\/+$/, '' ));
            }
        }
    };

    let onCheckNodeURL = () => {
        controller.fetchNodeInfo ( testURL );
        if ( !name ) {
            setSuggestName ( true );
        }
    };

    let onSubmit = () => {
        appState.affirmNetwork ( name, controller.info.identity, testURL )
        onClose ();
    };

    const isBusy = controller.state === NODE_INFO_STATE.BUSY;
    const nodeURLError = controller.state === NODE_INFO_STATE.ERROR && 'Error fetching node info.';
    const nodeType = controller.state === NODE_INFO_STATE.DONE && controller.info && controller.info.type;

    if ( !name && suggestName && ( nodeType === 'VOL_MINING_NODE' )) {
        const defaultName = controller.info.identity.toLowerCase ().replace ( /[^a-z0-9]+/g, '-' );
        onChangeName ( defaultName );
    }

    const submitEnabled = name && !nameError && ( nodeType === 'VOL_MINING_NODE' );

    return (
        <Modal
            size = 'small'
            closeIcon
            onClose = {() => { onClose ()}}
            open = { open }
        >
            <Modal.Header>Add Network</Modal.Header>

            <Modal.Content>
                <Form>

                    <Form.Field>
                        <Input
                            fluid
                            placeholder = "Network Name"
                            disabled = { isBusy }
                            type = "text"
                            value = { name }
                            onChange = {( event ) => { onChangeName ( event.target.value )}}
                        />
                        { nameError && <Label pointing prompt>{ nameError }</Label> }
                    </Form.Field>

                    <Form.Field>
                        <Input
                            fluid
                            loading = { isBusy }
                            action = {
                                <If condition = { !isBusy }>
                                    <Button
                                        icon = 'sync alternate'
                                        disabled = { !Boolean ( testURL )}
                                        onClick = { onCheckNodeURL }
                                    />
                                </If>
                            } 
                            placeholder = "Node URL"
                            name = "nodeURL"
                            type = "url"
                            value = { nodeURL }
                            onChange = {( event ) => { onChangeNodeURL ( event.target.value )}}
                        />
                        { nodeURLError && <Label pointing prompt>{ nodeURLError }</Label> }
                    </Form.Field>
                </Form>

                <Choose>
                    <When condition = { nodeType === 'VOL_MINING_NODE' }>
                        <Message
                            positive
                            icon = 'sitemap'
                            header = { controller.info.identity }
                            content = 'Mining network is online.'
                        />
                    </When>

                    <When condition = { controller.state === NODE_INFO_STATE.DONE }>
                        <Message
                            negatove
                            icon = 'question circle'
                            header = { UNKNOWN }
                            content = 'Not a mining node.'
                        />
                    </When>
                </Choose>

            </Modal.Content>

            <Modal.Actions>
                <Button
                    positive
                    disabled = { !submitEnabled }
                    onClick = { onSubmit }>
                    Save
                </Button>
            </Modal.Actions>
        </Modal>
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
