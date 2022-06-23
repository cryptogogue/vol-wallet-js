// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { TransactionMinerStatusTable }      from './TransactionQueueView';
import { WarnAndDeleteModal }               from './WarnAndDeleteModal';
import { hooks, RevocableContext, util }    from 'fgc';
import _                                    from 'lodash';
import { observer }                         from 'mobx-react';
import React                                from 'react';
import * as UI                              from 'semantic-ui-react';

//const debugLog = function () {}
const debugLog = function ( ...args ) { console.log ( '@PENDING ACCOUNT:', ...args ); }

const REQUEST_DELETE_WARNING_0 = `
    Deleting an account request will also delete the locally
    stored private key used to generate the request. If you have
    already submitted the request, the account may still be created
    but you may will not be able to access or use it.
`;

const REQUEST_DELETE_WARNING_1 = `
    If you you haven't backed up the private key in this account
    request, there will be no way to recover it. Are you sure
    you want to delete this request?
`;

//================================================================//
// PendingAccountView
//================================================================//
const PendingAccountView = observer (( props ) => {

    const { networkService, pending }   = props;
    const textAreaRef                   = React.useRef ();

    const onCopy = () => {
        if ( textAreaRef.current ) {
            textAreaRef.current.select ();
            document.execCommand ( 'copy' );
        }
    }

    const onDelete = () => {
        networkService.deleteAccountRequest ( pending.requestID );
    }

    const title         = pending.encoded ? 'Account Request' : 'New Account';
    const text          = pending.encoded || pending.publicKeyHex;
    const txQueueEntry  = networkService.pendingAccountTXs [ pending.requestID ]

    return (
        <React.Fragment>

            <UI.Menu
                borderless
                attached = 'top'
                color = 'orange'
                inverted
            >
                <UI.Menu.Item>
                    <UI.Menu.Header as = 'h5'>{ title }</UI.Menu.Header>
                </UI.Menu.Item>

                <WarnAndDeleteModal
                    trigger = {
                        <UI.Menu.Item position = 'right'>
                            <UI.Icon name = 'close'/>
                        </UI.Menu.Item>
                    }
                    warning0 = { REQUEST_DELETE_WARNING_0 }
                    warning1 = { REQUEST_DELETE_WARNING_1 }
                    onDelete = { onDelete }
                />
            </UI.Menu>

            <UI.Segment attached = 'bottom'>
                <UI.Segment
                    raised
                    style = {{
                        wordWrap: 'break-word',
                        fontFamily: 'monospace',
                        cursor: 'copy',
                    }}
                    onClick = { onCopy }
                >
                    { text }
                </UI.Segment>

                <If condition = { txQueueEntry && txQueueEntry.isPending }>
                    <TransactionMinerStatusTable txQueueEntry = { txQueueEntry }/>
                </If>

            </UI.Segment>

            <textarea
                readOnly
                ref     = { textAreaRef }
                value   = { util.wrapLines ( text, 32 )}
                style   = {{ position: 'absolute', top: '-1000px' }}
            />

        </React.Fragment>
    );
});

//================================================================//
// PendingAccountList
//================================================================//
export const PendingAccountList = observer (( props ) => {

    const { networkService } = props;

    let requests = [];
    for ( let requestID in networkService.pendingAccounts ) {
        const pending = networkService.pendingAccounts [ requestID ];
        requests.push (
            <PendingAccountView
                key                 = { requestID }
                networkService      = { networkService }
                pending             = { pending }
            />
        );
    }

    return (
        <UI.List>
            { requests }
        </UI.List>
    );
});

