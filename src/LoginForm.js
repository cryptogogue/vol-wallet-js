// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AppStateService }                  from './AppStateService';
import { PasswordInputField }               from './PasswordInputField';
import { WarnAndDeleteModal }               from './WarnAndDeleteModal';
import { assert, hooks }                    from 'fgc';
import { action, computed, extendObservable, observable, observe } from 'mobx';
import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import * as UI                              from 'semantic-ui-react';

const STORAGE_DELETE_WARNING_0 = `
    Deleting local storage will delete all private
    keys. Be sure you have a backup or your private keys
    will be lost forever. This cannot be undone.
`;

const STORAGE_DELETE_WARNING_1 = `
    If you lose your private keys, your assets and accounts cannot ever
    be recovered. By anyone. Do you understand?
`;

//================================================================//
// LoginForm
//================================================================//
export const LoginForm = observer (( props ) => {

    const { appState } = props;
    const [ password, setPassword ] = useState ( '' );

    const isEnabled = ( password.length > 0 );

    const onSubmit = () => {
        appState.login ( password );
    }

    return (
        <React.Fragment>

            <UI.Header as="h2" color="teal" textAlign="center">
                { 'Log in to your wallet.' }
            </UI.Header>

            <UI.Form size = "large">
                <UI.Segment stacked>
                    <PasswordInputField
                        appState = { appState }
                        setPassword = { setPassword }
                    />
                    <UI.Button
                        fluid
                        color = "teal"
                        size = "large"
                        disabled = { !isEnabled }
                        onClick = { onSubmit }
                    >
                        Login
                    </UI.Button>
                </UI.Segment>
            </UI.Form>

            <UI.Divider hidden/>

            <WarnAndDeleteModal
                trigger = {
                    <p style = {{ color: 'red', textAlign: 'center', cursor: 'pointer' }}>
                        { 'Delete Local Storage' }
                    </p>
                }
                warning0 = { STORAGE_DELETE_WARNING_0 }
                warning1 = { STORAGE_DELETE_WARNING_1 }
                onDelete = {() => { appState.deleteStorage ()}}
            />

        </React.Fragment>
    );
});
