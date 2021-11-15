// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

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
// AccountRequestService
//================================================================//
export class AccountRequestService {

    //----------------------------------------------------------------//
    constructor ( networkService ) {
        
        this.revocable = new RevocableContext ();
        this.checkPendingRequests ( networkService, 5000 );
    }

    //----------------------------------------------------------------//
    checkPendingRequests ( networkService, delay ) {

        const _fetch = async () => {

            for ( let requestID in networkService.pendingAccounts ) {

                const pendingAccount = networkService.pendingAccounts [ requestID ];
                if ( pendingAccount.readyToImport ) continue;

                try {

                    const keyID = pendingAccount.keyID;
                    const data = await this.revocable.fetchJSON ( networkService.getServiceURL ( `/keys/${ keyID }` ));

                    const keyInfo = data && data.keyInfo;

                    if ( keyInfo ) {
                        networkService.importAccountRequest (
                            requestID,
                            keyInfo.accountIndex,
                            keyInfo.accountName,
                            keyInfo.keyName
                        );
                    }
                }
                catch ( error ) {
                    console.log ( error );
                }
            }

            this.revocable.timeout (() => { this.checkPendingRequests ( networkService, delay )}, delay );
        }
        _fetch ();
    }
}

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

    const { networkService } = props;

    const service = hooks.useFinalizable (() => new AccountRequestService ( networkService ));

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

