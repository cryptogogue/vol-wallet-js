// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import * as UI                              from 'semantic-ui-react';

//================================================================//
// PasswordInputField
//================================================================//
export const PasswordInputField = observer (( props ) => {

    const { appState, setPassword } = props;
    const [ passwordInput, setPasswordInput ]   = useState ( '' );
    const [ passwordError, setPasswordError ]   = useState ( false );

    const onPasswordInput = ( input ) => {

        setPasswordInput ( input );

        const valid = appState.checkPassword ( input );
        setPassword ( valid ? input : '' );
        setPasswordError ( !valid );
    }

    return (
        <UI.Form.Input
            fluid
            icon = {( !passwordInput || passwordError ) ? 'lock' : 'unlock' }
            iconPosition = 'left'
            placeholder = 'Wallet Password'
            type = 'password'
            name = 'password'
            value = { passwordInput }
            onChange = {( event ) => { onPasswordInput ( event.target.value )}}
        />
    );
});
