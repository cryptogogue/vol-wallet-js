// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { PasswordInputField }                   from './PasswordInputField';
import { PhraseOrKeyField, PhraseOrKeyFieldController } from './PhraseOrKeyField';
import { TermsOfServiceController }             from './TermsOfServiceController';
import { TermsOfServiceModal }                  from './TermsOfServiceModal';
import { hooks, RevocableContext }              from 'fgc';
import { computed, observable, runInAction }    from 'mobx';
import { observer }                             from 'mobx-react';
import React, { useState }                      from 'react';
import ReactMarkdown                            from 'react-markdown'
import * as UI                                  from 'semantic-ui-react';

//================================================================//
// RequestAccountModal
//================================================================//
export const RequestAccountModal = observer (( props ) => {

    const { networkService, onClose } = props;

    const tosController             = hooks.useFinalizable (() => new TermsOfServiceController ( networkService ));
    const phraseOrKeyController     = hooks.useFinalizable (() => new PhraseOrKeyFieldController ( true ));

    const [ password, setPassword ]         = useState ( '' );
    const [ busy, setBusy ]                 = useState ( false );
    const [ showTOS, setShowTOS ]           = useState ( false );

    const createAccountRequest = () => {

        let signature = false;

        if ( tosController.text ) {
            signature = {
                hashAlgorithm:  'SHA256',
                signature:      phraseOrKeyController.key.sign ( tosController.text ),
            };
        }

        networkService.setAccountRequest (
            password,
            phraseOrKeyController.phraseOrKey,
            phraseOrKeyController.key,
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

    const submitEnabled = phraseOrKeyController.key && password;

    return (
        <React.Fragment>

            <UI.Modal
                open
                size = 'small'
                closeIcon
                onClose = {() => { onClose ()}}
            >
                <UI.Modal.Header>Request Account</UI.Modal.Header>
                
                <UI.Modal.Content>
                    <UI.Form>
                        <PhraseOrKeyField
                            controller      = { phraseOrKeyController }
                        />
                        <PasswordInputField
                            appState        = { networkService.appState }
                            setPassword     = { setPassword }
                        />
                    </UI.Form>
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
