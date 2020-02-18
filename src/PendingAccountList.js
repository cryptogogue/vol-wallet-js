// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AppStateService }                  from './AppStateService';
import { WarnAndDeleteModal }               from './WarnAndDeleteModal';
import { assert, crypto, excel, hooks, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import _                                    from 'lodash';
import { action, computed, extendObservable, observable, observe } from 'mobx';
import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import { Redirect }                         from 'react-router';
import * as UI                              from 'semantic-ui-react';

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
// AccountRequestService
//================================================================//
export class AccountRequestService {

    //----------------------------------------------------------------//
    constructor ( appState ) {
        
        this.revocable = new RevocableContext ();
        this.checkPendingRequests ( appState, 5000 );
    }

    //----------------------------------------------------------------//
    checkPendingRequests ( appState, delay ) {

        const _fetch = async () => {

            for ( let requestID in appState.pendingAccounts ) {

                const pendingAccount = appState.pendingAccounts [ requestID ];
                if ( pendingAccount.readyToImport ) continue;

                try {

                    const keyID = pendingAccount.keyID;
                    const data = await this.revocable.fetchJSON ( `${ appState.network.nodeURL }/keys/${ keyID }` );

                    const keyInfo = data && data.keyInfo;

                    if ( keyInfo ) {
                        appState.importAccountRequest (
                            requestID,
                            keyInfo.accountName,
                            keyInfo.keyName
                        );
                    }
                }
                catch ( error ) {
                    console.log ( error );
                }
            }

            this.revocable.timeout (() => { this.checkPendingRequests ( appState, delay )}, delay );
        }
        _fetch ();
    }

    //----------------------------------------------------------------//
    finalize () {

        this.revocable.finalize ();
    }
}

//================================================================//
// PendingAccountView
//================================================================//
const PendingAccountView = observer (( props ) => {

    const { appState, pending } = props;
    const textAreaRef           = React.useRef ();

    const onCopy = () => {
        if ( textAreaRef.current ) {
            textAreaRef.current.select ();
            document.execCommand ( 'copy' );
        }
    }

    const onDelete = () => {
        appState.deleteAccountRequest ( pending.requestID );
    }

    return (
        <React.Fragment>

            <UI.Menu
                borderless
                attached = 'top'
                color = 'orange'
                inverted
            >
                <UI.Menu.Item>
                    <UI.Menu.Header as = 'h5'>Account Request</UI.Menu.Header>
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
                    { pending.encoded }
                </UI.Segment>
            </UI.Segment>

            <textarea
                readOnly
                ref     = { textAreaRef }
                value   = { util.wrapLines ( pending.encoded, 32 )}
                style   = {{ position: 'absolute', top: '-1000px' }}
            />

        </React.Fragment>
    );
});

//================================================================//
// PendingAccountList
//================================================================//
export const PendingAccountList = observer (( props ) => {

    const { appState } = props;

    const service = hooks.useFinalizable (() => new AccountRequestService ( appState ));

    let requests = [];
    for ( let requestID in appState.pendingAccounts ) {
        const pending = appState.pendingAccounts [ requestID ];
        requests.push (
            <PendingAccountView
                key = { requestID }
                appState = { appState }
                pending = { pending }
            />
        );
    }

    return (
        <UI.List>
            { requests }
        </UI.List>
    );
});

