// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { PasswordInputField }                   from './PasswordInputField';
import { PhraseOrKeyField }                     from './PhraseOrKeyField';
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
export const TermsOfServiceModal = observer (( props ) => {

    const { controller, onAccept, onDecline } = props;

    return (
        <UI.Modal
            open
            size = 'large'
            closeIcon
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
