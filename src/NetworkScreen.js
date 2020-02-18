// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AccountList }                      from './AccountList';
import { AppStateService }                  from './AppStateService';
import { ImportAccountModal }               from './ImportAccountModal';
import { NetworkNavigationBar, NETWORK_TABS } from './NetworkNavigationBar';
import { PendingAccountList }               from './PendingAccountList';
import { RequestAccountModal }              from './RequestAccountModal';
import { assert, excel, hooks, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import { action, computed, extendObservable, observable, observe } from 'mobx';
import { observer }                         from 'mobx-react';
import React, { useState, useRef }          from 'react';
import { Link }                             from 'react-router-dom';
import * as UI                              from 'semantic-ui-react';

//================================================================//
// NetworkActionsSegment
//================================================================//
export const NetworkActionsSegment = observer (( props ) => {

    const { appState } = props;

    const segmentRef                                                = useRef ();
    const [ importAccountModalOpen, setImportAccountModalOpen ]     = useState ( false );
    const [ requestAccountModalOpen, setRequestAccountModalOpen ]   = useState ( false );

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
                    <UI.Icon name = 'cloud download'/>
                    Import Account
                </UI.Button>

                <UI.Button
                    fluid
                    color = 'teal'
                    attached = 'bottom'
                    onClick = {() => { setRequestAccountModalOpen ( true )}}
                >
                    <UI.Icon name = 'envelope'/>
                    Request Account
                </UI.Button>
            </UI.Segment>

            <ImportAccountModal
                appState = { appState }
                open = { importAccountModalOpen }
                onClose = {() => { setImportAccountModalOpen ( false )}}
            />

            <RequestAccountModal
                appState = { appState }
                open = { requestAccountModalOpen }
                onClose = {() => { setRequestAccountModalOpen ( false )}}
            />
        </div>
    );
});

//================================================================//
// NetworkScreen
//================================================================//
export const NetworkScreen = observer (( props ) => {

    const networkIDFromEndpoint     = util.getMatch ( props, 'networkID' );
    const appState                  = hooks.useFinalizable (() => new AppStateService ( networkIDFromEndpoint ));

    return (
        <SingleColumnContainerView>

            <NetworkNavigationBar
                appState = { appState }
                tab = { NETWORK_TABS.NETWORK }
                networkID = { networkIDFromEndpoint }
            />

            <AccountList appState = { appState }/>
            <PendingAccountList appState = { appState }/>
            <NetworkActionsSegment appState = { appState }/>

        </SingleColumnContainerView>
    );
});
