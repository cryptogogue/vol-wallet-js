// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { PasswordInputField }                   from '../PasswordInputField';
import { ControlCommandDropdown }               from './ControlCommandDropdown';
import { ControlCommandForm }                   from './ControlCommandForm';
import { assert, excel, hooks, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                             from 'mobx-react';
import React, { useState }                      from 'react';
import * as UI                                  from 'semantic-ui-react';

//================================================================//
// ErrorMessageModal
//================================================================//
const ErrorMessageModal = observer (( props ) => {

    return (
        <UI.Modal
            closeIcon
            onClose = {() => { props.onClose ()}}
            open = { props.open }
        >
            <UI.Modal.Header>Error</UI.Modal.Header>
            
            <UI.Modal.Content>
                <UI.Message
                    negative
                    icon        = 'exclamation triangle'
                    header      = 'An error occurred.'
                    content     = { props.message }
                />
            </UI.Modal.Content>
        </UI.Modal>
    );
});

//================================================================//
// ControlCommandModalBody
//================================================================//
const ControlCommandModalBody = observer (( props ) => {

    const { appState, open, onClose }                               = props;
    const [ password, setPassword ]                                 = useState ( '' );
    const [ controllerFromDropdown, setControllerFromDropdown ]     = useState ( false );
    const [ isBusy, setIsBusy ]                                     = useState ( false );
    const [ error, setError ]                                       = useState ( '' );

    const controller        = props.controller || controllerFromDropdown;

    const showDropdown      = !props.controller;
    const title             = controller ? controller.friendlyName : 'New Command';
    const submitEnabled     = controller && controller.isCompleteAndErrorFree && appState.checkPassword ( password );

    const submit = async () => {

        setIsBusy ( true );

        const envelope = await controller.makeSignedEnvelope ( password );

        const result = await fetch ( `${ appState.network.nodeURL }/control`, {
            method :    'POST',
            headers :   { 'content-type': 'application/json' },
            body :      JSON.stringify ( envelope, null, 4 ),
        });
        const json = await result.json ();

        setIsBusy ( false );

        if ( json.status === 'OK' ) {
            onClose ();
        }
        else { 
            setError ( json.message );
        }
    }

    return (
        <UI.Modal
            key = { controller ? controller.type : -1 }
            size = 'small'
            closeIcon
            onClose = {() => { onClose ()}}
            open = { open }
        >
            <UI.Modal.Header>{ title }</UI.Modal.Header>
            
            <UI.Modal.Content>

                <ErrorMessageModal
                    open            = { Boolean ( error )}
                    onClose         = {() => { setError ( '' )}}
                    message         = { error }
                />

                <If condition = { showDropdown }>
                    <ControlCommandDropdown
                        appState                = { appState }
                        controller              = { controller }
                        setController           = { setControllerFromDropdown }
                    />
                </If>
                
                <If condition = { controller }>
                    <ControlCommandForm controller = { controller }/>
                </If>

                <UI.Form>
                    <PasswordInputField
                        appState = { appState }
                        setPassword = { setPassword }
                    />
                </UI.Form>
            </UI.Modal.Content>

            <UI.Modal.Actions>
                <UI.Button
                    positive
                    disabled = { isBusy || !submitEnabled }
                    onClick = {() => { submit ()}}
                >
                    Submit
                </UI.Button>
            </UI.Modal.Actions>
        </UI.Modal>
    );
});

//================================================================//
// ControlCommandModal
//================================================================//
export const ControlCommandModal = observer (( props ) => {

    const { appState } = props;
    const [ counter, setCounter ] = useState ( 0 );

    const onClose = () => {
        setCounter ( counter + 1 );
        props.onClose ();
    }

    return (
        <div key = { `${ counter }` }>
            <ControlCommandModalBody
                appState                = { appState }
                open                    = { props.open }
                onClose                 = { onClose }
                controller              = { props.controller || false }
            />
        </div>
    );
});
