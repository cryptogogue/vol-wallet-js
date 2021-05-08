import { AppStateService }                              from './services/AppStateService';
import { AccountNavigationBar, ACCOUNT_TABS }           from './AccountNavigationBar';
import { AccountStateService }                          from './services/AccountStateService';
import * as bcrypt                                      from 'bcryptjs';
import { assert, crypto, hooks, InfiniteScrollView, RevocableContext, SingleColumnContainerView, storage, util } from 'fgc';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                                     from 'mobx-react';
import React, { useState, useRef, useLayoutEffect }     from 'react';
import JSONTree                                         from 'react-json-tree';
import * as UI                                          from 'semantic-ui-react';
import url                                              from 'url';

//const debugLog = function () {}
const debugLog = function ( ...args ) { console.log ( '@DIAGNOSTIC:', ...args ); }

//================================================================//
// PasswordInputField
//================================================================//
export const PasswordInputField = observer (( props ) => {

    const { setPassword, passwordHash }         = props;
    const [ passwordInput, setPasswordInput ]   = useState ( '' );
    const [ passwordError, setPasswordError ]   = useState ( false );

    const checkPassword = ( password ) => {

        if ( !passwordHash ) return true;

        if ( password ) {
            return (( passwordHash.length > 0 ) && bcrypt.compareSync ( password, passwordHash ));
        }
        return false;
    }

    const onPasswordInput = ( input ) => {

        setPasswordInput ( input );

        const valid = checkPassword ( input );
        setPassword ( valid ? input : '' );
        setPasswordError ( !valid );
    }

    return (
        <UI.Form.Input
            fluid
            icon            = {( !passwordInput || passwordError ) ? 'lock' : 'unlock' }
            iconPosition    = 'left'
            placeholder     = 'Wallet Password'
            type            = 'password'
            name            = 'password'
            value           = { passwordInput }
            onChange        = {( event ) => { onPasswordInput ( event.target.value )}}
            disabled        = { props.disabled }
        />
    );
});

//================================================================//
// DiagnosticAndRecoveryScreen
//================================================================//
export const DiagnosticAndRecoveryScreen = observer (( props ) => {

    const [ dump ]                          = useState ( storage.dump );
    const [ count, setCount ]               = useState ( 0 );
    const [ ciphertext, setCiphertext ]     = useState ( '' );
    const [ plaintext, setPlaintext ]       = useState ( '' );
    const [ password, setPassword ]         = useState ( '' );

    const passwordHash = dump [ '.vol.passwordHash' ];

    const decrypt = () => {
        const decrypted = crypto.aesCipherToPlain ( ciphertext, password );
        setPlaintext ( decrypted );
    }

    const onCloseDecryptModal = () => {
        setPlaintext ( '' );
        setPassword ( '' );
        setCount ( count + 1 );
    }

    return (
        <SingleColumnContainerView title = 'VOLWAL Diagnostic and Recovery'>

            <UI.Modal
                open                    = { Boolean ( plaintext )}
                onClose                 = { onCloseDecryptModal }
                closeIcon
                closeOnDimmerClick
            >
                <UI.Modal.Content>
                    <div style = {{ fontFamily: 'monospace', whiteSpace: 'pre' }}>{ plaintext }</div>
                </UI.Modal.Content>
            </UI.Modal>

            <UI.Form size = "large">
                <UI.Segment stacked>
                    <UI.Form.TextArea
                        rows            = { 8 }
                        placeholder     = "Ciphertext"
                        style           = {{ fontFamily: 'monospace' }}
                        value           = { ciphertext }
                        onChange        = {( event ) => { setCiphertext ( event.target.value )}}
                    />
                    <PasswordInputField key = { count } setPassword = { setPassword } passwordHash = { passwordHash }/>
                    <UI.Button
                        fluid
                        color           = 'red'
                        onClick         = {() => { decrypt ()}}
                        disabled        = { !( password && ciphertext )}
                    >
                        <UI.Icon name = 'envelope open'/>
                        Decrypt
                    </UI.Button>
                </UI.Segment>
            </UI.Form>

            <JSONTree
                hideRoot
                data                    = { dump }
                theme                   = 'bright'
                shouldExpandNode        = {() => { return true; }}
            />
        </SingleColumnContainerView>
    );
});

