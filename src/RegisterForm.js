// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AppStateService }                  from './AppStateService';
import { ConfirmPasswordInputField }        from './ConfirmPasswordInputField';
import { assert, excel, hooks, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import { action, computed, extendObservable, observable, observe } from 'mobx';
import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import { Redirect }                         from 'react-router';
import { Button, Divider, Dropdown, Form, Header, Icon, Modal, Segment }  from 'semantic-ui-react';

import * as bcrypt              from 'bcryptjs';
    
//================================================================//
// RegisterForm
//================================================================//
export const RegisterForm = observer (( props ) => {

    const { appState } = props;
    const [ password, setPassword ] = useState ( '' );

    return (
        <React.Fragment>

            <Header as="h2" color="teal" textAlign="center">
                { 'Choose a password for your wallet.' }
            </Header>

            <Form size = "large" onSubmit = {() => { appState.setPassword ( password, true )}}>
                <Segment stacked>
                    <ConfirmPasswordInputField
                        setPassword = { setPassword }
                    />
                    <Button color = "teal" fluid size = "large" disabled = { !password }>
                        Create Password
                    </Button>
                </Segment>
            </Form>

        </React.Fragment>
    );
});
