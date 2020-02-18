// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import * as UI                              from 'semantic-ui-react';

//================================================================//
// ConfirmPasswordInputField
//================================================================//
export const ConfirmPasswordInputField = observer (( props ) => {

    const { appState } = props;
    const [ password, setPassword ]                 = useState ( '' );
    const [ confirmPassword, setConfirmPassword ]   = useState ( '' );

    const updatePasswords = ( password, confirmPassword ) => {
        const valid = (( password && confirmPassword ) && ( password === confirmPassword ));
        props.setPassword ( valid ? password : '' );
    }

    const onPassword = ( input ) => {
        setPassword ( input );
        updatePasswords ( input, confirmPassword );
    }

    const onConfirmPassword = ( input ) => {
        setConfirmPassword ( input );
        updatePasswords ( password, input );
    }

    return (
        <React.Fragment>
            <UI.Form.Input
                fluid
                icon = 'lock'
                iconPosition = 'left'
                placeholder = 'Password'
                type = 'password'
                name = 'password'
                value = { password }
                onChange = {( event ) => { onPassword ( event.target.value )}}
            />
            <UI.Form.Input
                fluid
                icon = 'lock'
                iconPosition = 'left'
                placeholder = 'Confirm Password'
                type = 'password'
                name = 'confirmPassword'
                value = { confirmPassword }
                onChange = {( event ) => { onConfirmPassword ( event.target.value )}}
            />
        </React.Fragment>
    );
});
