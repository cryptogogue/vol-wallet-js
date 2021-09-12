// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { KeyAndPasswordForm }                   from './KeyAndPasswordForm';
import { TermsOfServiceController }             from './TermsOfServiceController';
import { hooks, RevocableContext }              from 'fgc';
import { computed, observable, runInAction }    from 'mobx';
import { observer }                             from 'mobx-react';
import React, { useState }                      from 'react';
import ReactMarkdown                            from 'react-markdown'
import * as UI                                  from 'semantic-ui-react';

//================================================================//
// TermsOfServiceModal
//================================================================//
const TermsOfServiceModal = observer (( props ) => {

    const { controller, onAccept, onDecline } = props;

    return (
        <UI.Modal
            size = 'large'
            closeIcon
            open        = { true }
            onClose     = {() => { onDecline ()}}
        >
            <UI.Modal.Header>Terms of Service</UI.Modal.Header>

            <UI.Modal.Content>
                <ReactMarkdown>
                    { controller.text }
                </ReactMarkdown>
            </UI.Modal.Content>

            <UI.Modal.Actions>
                <UI.Button
                    positive
                    onClick         = {() => { onAccept ()}}
                >
                    Accept
                </UI.Button>
            </UI.Modal.Actions>
        </UI.Modal>
    );
});

//================================================================//
// RequestAccountModalBody
//================================================================//
const RequestAccountModalBody = observer (( props ) => {

    const { networkService, open, onClose } = props;

    const tosController = hooks.useFinalizable (() => new TermsOfServiceController ( networkService ));

    const [ key, setKey ]                   = useState ( false );
    const [ phraseOrKey, setPhraseOrKey ]   = useState ( '' );
    const [ password, setPassword ]         = useState ( '' );
    const [ busy, setBusy ]                 = useState ( false );
    const [ showTOS, setShowTOS ]           = useState ( false );

    const createAccountRequest = () => {

        let signature = false;

        if ( tosController.text ) {
            signature = {
                hashAlgorithm:  'SHA256',
                signature:      key.sign ( tosController.text ),
            };
        }

        networkService.setAccountRequest (
            password,
            phraseOrKey,
            key.getKeyID (),
            key.getPrivateHex (),
            key.getPublicHex (),
            signature
        );
        onClose ();
    }

    if ( busy && !tosController.isBusy ) {
        if ( tosController.text === '' ) {
            createAccountRequest ();
        }
        else {
            setShowTOS ( true );
            setBusy ( false );
        }
    }

    const submitEnabled     = key && password;

    return (
        <React.Fragment>

            <UI.Modal
                size = 'small'
                closeIcon
                onClose = {() => { onClose ()}}
                open = { open }
            >
                <UI.Modal.Header>Request Account</UI.Modal.Header>
                
                <UI.Modal.Content>
                    <KeyAndPasswordForm
                        appState        = { networkService.appState }
                        setKey          = { setKey }
                        setPhraseOrKey  = { setPhraseOrKey }
                        setPassword     = { setPassword }
                        generate
                    />
                </UI.Modal.Content>

                <UI.Modal.Actions>
                    <UI.Button
                        positive
                        disabled        = { !submitEnabled }
                        onClick         = {() => { setBusy ( true )}}
                        loading         = { busy }
                    >
                        Request Account
                    </UI.Button>
                </UI.Modal.Actions>
            </UI.Modal>

            <If condition = { showTOS }>
                <TermsOfServiceModal
                    controller          = { tosController }
                    onAccept            = {() => { createAccountRequest ()}}
                    onDecline           = {() => { setShowTOS ( false )}}
                />
            </If>

        </React.Fragment>
    );
});

//================================================================//
// RequestAccountModal
//================================================================//
export const RequestAccountModal = observer (( props ) => {

    const { networkService, open } = props;
    const [ counter, setCounter ] = useState ( 0 );

    const onClose = () => {
        setCounter ( counter + 1 );
        props.onClose ();
    }

    return (
        <div key = { counter }>
            <RequestAccountModalBody
                networkService  = { networkService }
                open            = { open }
                onClose         = { onClose }
            />
        </div>
    );
});
