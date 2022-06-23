// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { PasswordInputField }                   from './PasswordInputField';
import { PhraseOrKeyField, PhraseOrKeyFieldController } from './PhraseOrKeyField';
import { TermsOfServiceController }             from './TermsOfServiceController';
import { TermsOfServiceModal }                  from './TermsOfServiceModal';
import * as fgc                                 from 'fgc';
import { computed, observable, runInAction }    from 'mobx';
import { observer }                             from 'mobx-react';
import React, { useState }                      from 'react';
import JSONTree                                 from 'react-json-tree';
import ReactMarkdown                            from 'react-markdown'
import * as UI                                  from 'semantic-ui-react';
import * as vol                                 from 'vol';

//================================================================//
// LoadJSONField
//================================================================//
export const LoadJSONField = observer (( props ) => {

    const loadFile = ( text ) => {
        const json = JSON.parse ( text );
        props.onJSON ( json )
    }

    return (
        <UI.Form.Field>

             <UI.Menu attached = 'top'>
                <fgc.FilePickerMenuItem
                    loadFile            = { loadFile }
                    format              = 'text'
                    accept              = { '.json' }
                />
            </UI.Menu>
            <UI.Segment secondary attached = 'bottom'>
                <If condition = { props.json }>
                    <UI.Form.Field>
                        <UI.Segment>
                            <JSONTree
                                hideRoot
                                sortObjectKeys
                                data                = { props.json }
                                theme               = 'bright'
                                shouldExpandNode    = {() => { return true; }}
                            />
                        </UI.Segment>
                    </UI.Form.Field>
                </If>
            </UI.Segment>

        </UI.Form.Field>
    );
});

const NEW_ACCOUNT_TAB = {
    KEY_PAIR:               'KEY_PAIR',
    IDENTITY:               'IDENTITY',
};

//================================================================//
// NewAccountModal
//================================================================//
export const NewAccountModal = observer (( props ) => {

    const { networkService, onClose } = props;

    const revocable                 = fgc.hooks.useFinalizable (() => new fgc.RevocableContext ());
    const phraseOrKeyController     = fgc.hooks.useFinalizable (() => new PhraseOrKeyFieldController ( true ));
    const tosController             = fgc.hooks.useFinalizable (() => new TermsOfServiceController ( networkService ));

    const [ tab, setTab ]                   = useState ( NEW_ACCOUNT_TAB.KEY_PAIR );
    const [ key, setKey ]                   = useState ( false );
    const [ phraseOrKey, setPhraseOrKey ]   = useState ( '' );
    const [ identity, setIdentity ]         = useState ();
    const [ password, setPassword ]         = useState ( '' );
    const [ busy, setBusy ]                 = useState ( false );
    const [ showTOS, setShowTOS ]           = useState ( false );

    const createAccountRequestAsync = async () => {

        console.log ( 'createAccountRequestAsync' );

        setShowTOS ( false );
        setBusy ( true );
        
        try {

            let signature = false;

            if ( tosController.text ) {
                signature = {
                    hashAlgorithm:  'SHA256',
                    signature:      phraseOrKeyController.key.sign ( tosController.text ),
                };
            }

            const txBody = {
                type:               'NEW_ACCOUNT',
                genesis:            networkService.genesis,
                key: {
                    type:           'EC_HEX',
                    groupName:      'secp256k1',
                    publicKey:      phraseOrKeyController.publicHex,
                },
                provider:           'gamercert',
                identity:           identity,
            };

            const identityProviderResult = await revocable.fetchJSON ( networkService.getServiceURL ( '/providers/gamercert' ));
            const identityProvider = identityProviderResult.provider;

            const networkInfoResult = await revocable.fetchJSON ( networkService.getServiceURL ( '/' ));
            const feeSchedule = networkInfoResult.feeSchedule;

            const fees = vol.util.calculateTransactionFees ( feeSchedule, txBody.type, 0, identityProvider.grant );

            txBody.maker = {
                accountName:    '',
                keyName:        '',
                nonce:          0,
                gratuity:       0,
                profitShare:    fees.profitShare,
                transferTax:    fees.transferTax,
                
            }

            networkService.setAccountRequest (
                password,
                phraseOrKeyController.phraseOrKey,
                phraseOrKeyController.key,
                signature,
                txBody
            );

            onClose ();
        }
        catch ( error ) {
            console.log ( 'AN ERROR!' );
            console.log ( error );
        }
        setBusy ( false );
    }

    const onSubmit = () => {
        tosController.text && setShowTOS ( true ) || createAccountRequestAsync ();
    }

    const submitEnabled = !tosController.isBusy && phraseOrKeyController.key && identity && password;

    return (
        <React.Fragment>

            <UI.Modal
                open
                size = 'small'
                closeIcon
                onClose = {() => { onClose ()}}
            >
                <UI.Modal.Header>New Account</UI.Modal.Header>
                
                <UI.Modal.Content>
                    <UI.Form>

                        <UI.Menu pointing secondary>
                            <UI.Menu.Item
                                active          = { tab === NEW_ACCOUNT_TAB.KEY_PAIR }
                                onClick         = {() => { setTab ( NEW_ACCOUNT_TAB.KEY_PAIR ); }}
                            >
                                Key Pair
                            </UI.Menu.Item>
                            <UI.Menu.Item
                                active          = { tab === NEW_ACCOUNT_TAB.IDENTITY }
                                onClick         = {() => { setTab ( NEW_ACCOUNT_TAB.IDENTITY ); }}
                            >
                                Identity
                            </UI.Menu.Item>
                        </UI.Menu>

                        <Choose>
                            <When condition = { tab === NEW_ACCOUNT_TAB.KEY_PAIR }>
                                <PhraseOrKeyField controller = { phraseOrKeyController }/>
                            </When>
                            <When condition = { tab === NEW_ACCOUNT_TAB.IDENTITY }>
                                <LoadJSONField json = { identity } onJSON = { setIdentity }/>
                            </When>
                        </Choose>

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
                        onClick         = { onSubmit }
                        loading         = { busy }
                    >
                        Create Account
                    </UI.Button>
                </UI.Modal.Actions>
            </UI.Modal>

            <If condition = { showTOS }>
                <TermsOfServiceModal
                    controller          = { tosController }
                    onAccept            = { createAccountRequestAsync }
                    onDecline           = {() => { setShowTOS ( false )}}
                />
            </If>

        </React.Fragment>
    );
});
