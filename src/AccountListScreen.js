// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AccountList }                      from './AccountList';
import { ImportAccountModal }               from './ImportAccountModal';
import { NetworkNavigationBar, NETWORK_TABS } from './NetworkNavigationBar';
import { NewAccountModal }                  from './NewAccountModal';
import { PendingAccountList }               from './PendingAccountList';
import { RequestAccountModal }              from './RequestAccountModal';
import { AppStateService }                  from './services/AppStateService';
import { SingleColumnContainerView, util }  from 'fgc';
import { observer }                         from 'mobx-react';
import React, { useState, useRef }          from 'react';
import { Redirect }                         from 'react-router';
import * as UI                              from 'semantic-ui-react';

const appState = AppStateService.get ();

//================================================================//
// NetworkActionsSegment
//================================================================//
export const NetworkActionsSegment = observer (( props ) => {

    const { networkService } = props;
    const appState = networkService.appState;

    const segmentRef                                                = useRef ();
    const [ importAccountModalOpen, setImportAccountModalOpen ]     = useState ( false );
    const [ requestAccountModalOpen, setRequestAccountModalOpen ]   = useState ( false );
    const [ newAccountModalOpen, setNewAccountModalOpen ]           = useState ( false );

    const anyModalOpen = importAccountModalOpen || requestAccountModalOpen;

    return (
        <div ref = { segmentRef }>

            <UI.Popup
                open = {( appState.flags.promptFirstAccount && !anyModalOpen ) ? true : false }
                content = 'Add or import an account.'
                position = 'bottom center'
                context = { segmentRef }
            />

            <UI.Segment>
                <UI.Button
                    fluid
                    color = 'teal'
                    attached = 'top'
                    onClick = {() => { setImportAccountModalOpen ( true )}}
                >
                    <UI.Icon name = 'sign in'/>
                    Import Account
                </UI.Button>

                <UI.Button
                    fluid
                    color = 'teal'
                    attached
                    onClick = {() => { setRequestAccountModalOpen ( true )}}
                >
                    <UI.Icon name = 'envelope'/>
                    Request Account
                </UI.Button>

                <UI.Button
                    fluid
                    color = 'teal'
                    attached = 'bottom'
                    onClick = {() => { setNewAccountModalOpen ( true )}}
                >
                    <UI.Icon name = 'certificate'/>
                    New Account with Identity
                </UI.Button>
            </UI.Segment>

            <If condition = { importAccountModalOpen }>
                <ImportAccountModal
                    networkService      = { networkService }
                    onClose             = {() => { setImportAccountModalOpen ( false )}}
                />
            </If>

            <If condition = { requestAccountModalOpen }>
                <RequestAccountModal
                    networkService      = { networkService }
                    onClose             = {() => { setRequestAccountModalOpen ( false )}}
                />
            </If>

            <If condition = { newAccountModalOpen }>
                <NewAccountModal
                    networkService      = { networkService }
                    onClose             = {() => { setNewAccountModalOpen ( false )}}
                />
            </If>
        </div>
    );
});

//================================================================//
// AccountListScreen
//================================================================//
export const AccountListScreen = observer (( props ) => {

    if ( AppStateService.needsReset ()) return (<Redirect to = { '/util/reset' }/>);

    const networkIDFromEndpoint     = util.getMatch ( props, 'networkID' );
    const networkService            = appState.assertNetworkService ( networkIDFromEndpoint );

    return (
        <SingleColumnContainerView>

            <NetworkNavigationBar
                networkService      = { networkService }
                tab                 = { NETWORK_TABS.ACCOUNTS }
                networkID           = { networkIDFromEndpoint }
            />

            <AccountList networkService             = { networkService }/>
            <PendingAccountList networkService      = { networkService }/>
            <NetworkActionsSegment networkService   = { networkService }/>

        </SingleColumnContainerView>
    );
});
