// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AppStateService }                  from './AppStateService';
import { ConfirmPasswordInputField }        from './ConfirmPasswordInputField';
import { PasswordInputField }               from './PasswordInputField';
import { assert, crypto, excel, FilePickerMenuItem, hooks, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import { Redirect }                         from 'react-router';
import * as UI                              from 'semantic-ui-react';

//================================================================//
// ChangePasswordModalBody
//================================================================//
const ChangePasswordModalBody = observer (( props ) => {

    const { appState, open, onClose } = props;

    const [ password, setPassword ]         = useState ( '' );
    const [ newPassword, setNewPassword ]   = useState ( '' );

    const changePassword = () => {
        appState.changePassword (
            password,
            newPassword
        );
        onClose ();
    }

    const submitEnabled = password && newPassword;

    return (
        <UI.Modal
            size = 'small'
            closeIcon
            onClose = {() => { onClose ()}}
            open = { open }
        >
            <UI.Modal.Header>Change Password</UI.Modal.Header>
            
            <UI.Modal.Content>
                <UI.Form>
                    <PasswordInputField
                        appState        = { appState }
                        setPassword     = { setPassword }
                    />           
                    <ConfirmPasswordInputField
                        setPassword         = { setNewPassword }
                    />
                </UI.Form>
            </UI.Modal.Content>

            <UI.Modal.Actions>
                <UI.Button
                    positive
                    disabled = { !submitEnabled }
                    onClick = {() => { changePassword ()}}
                >
                    Submit
                </UI.Button>
            </UI.Modal.Actions>
        </UI.Modal>
    );
});

//================================================================//
// ChangePasswordModal
//================================================================//
export const ChangePasswordModal = observer (( props ) => {

    const { appState, open } = props;
    const [ counter, setCounter ] = useState ( 0 );

    const onClose = () => {
        setCounter ( counter + 1 );
        props.onClose ();
    }

    return (
        <div key = { counter }>
            <ChangePasswordModalBody
                appState    = { appState }
                open        = { open }
                onClose     = { onClose }
            />
        </div>
    );
});
