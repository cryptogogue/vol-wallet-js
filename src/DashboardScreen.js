// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AddNetworkModal }                  from './AddNetworkModal';
import { DashboardNavigationBar }           from './DashboardNavigationBar';
import { LoginForm }                        from './LoginForm';
import { PollingList }                      from './PollingList';
import { RegisterForm }                     from './RegisterForm';
import { AppStateService }                  from './services/AppStateService';
import { WarnAndDeleteModal }               from './WarnAndDeleteModal';
import { assert, excel, hooks, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import _                                    from 'lodash';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';
import React, { useState, useRef }          from 'react';
import { Link }                             from 'react-router-dom';
import * as UI                              from 'semantic-ui-react';

const NETWORK_DELETE_WARNING_0 = `
    Deleting a network will also delete all locally stored accounts and
    private keys. Be sure you have a backup or your private keys
    will be lost forever. This cannot be undone.
`;

const NETWORK_DELETE_WARNING_1 = `
    If you lose your private keys, your assets and accounts cannot ever
    be recovered. By anyone. Do you understand?
`;

//================================================================//
// NetworkList
//================================================================//
export const NetworkList = observer (( props ) => {

    const { appState }  = props;

    const asyncGetInfo = async ( revocable, networkID ) => {
        const networkService = appState.networksByID [ networkID ];
        const info = await revocable.fetchJSON ( networkService.nodeURL );
        return info && info.type === 'VOL_MINING_NODE' ? info : false;
    }

    const checkIdentifier = ( networkID ) => {
        return _.has ( appState.networksByID, networkID );
    }

    const onDelete = ( networkID ) => {
        appState.deleteNetwork ( networkID );
    }

    const makeItemMessageBody = ( networkID, info ) => {

        const networkService = appState.networksByID [ networkID ];

        const nodeURL       = networkService.nodeURL;
        const schema        = info && info.schemaVersion;
        const schemaString  = info ? `Schema ${ schema.major }.${ schema.minor }.${ schema.revision } - "${ schema.release }"` : '';

        return (
            <React.Fragment>
                <UI.Message.Header
                    as = { Link }
                    to = { `/net/${ networkID }` }
                >
                    { networkID }
                </UI.Message.Header>
                <UI.Message.Content>
                    <a href = { nodeURL } target = '_blank'>{ nodeURL }</a>
                    <If condition = { info }>
                        <p style = {{ padding: 0, margin: 0 }}>{ info.build }</p>
                        <p style = {{ padding: 0, margin: 0 }}>{ schemaString }</p>
                    </If>
                </UI.Message.Content>
            </React.Fragment>
        );
    }

    return (
        <PollingList
            items                   = { appState.networkIDs }
            asyncGetInfo            = { asyncGetInfo }
            checkIdentifier         = { checkIdentifier }
            onDelete                = { onDelete }
            makeItemMessageBody     = { makeItemMessageBody }
            warning0                = { NETWORK_DELETE_WARNING_0 }
            warning1                = { NETWORK_DELETE_WARNING_1 }
        />
    );
});

//================================================================//
// DashboardActionsSegment
//================================================================//
export const DashboardActionsSegment = observer (( props ) => {

    const { appState } = props;

    const segmentRef                                        = useRef ();
    const [ addNetworkModalOpen, setAddNetworkModalOpen ]   = useState ( false );

    return (
        <div ref = { segmentRef }>

            <UI.Popup
                open = {( appState.flags.promptFirstNetwork && !addNetworkModalOpen ) ? true : false }
                content = 'Add the first mining network.'
                position = 'bottom center'
                context = { segmentRef }
            />

            <UI.Segment>
                <UI.Button
                    fluid
                    color = 'teal'
                    onClick = {() => { setAddNetworkModalOpen ( true )}}
                >
                    <UI.Icon name = 'add square'/>
                    Add Network
                </UI.Button>
            </UI.Segment>

            <AddNetworkModal
                appState = { appState }
                open = { addNetworkModalOpen }
                onClose = {() => { setAddNetworkModalOpen ( false )}}
            />
        </div>
    );
});

//================================================================//
// DashboardScreen
//================================================================//
export const DashboardScreen = observer (( props ) => {

    const appState      = hooks.useFinalizable (() => new AppStateService ());

    return (
        <SingleColumnContainerView>

            <Choose>

                <When condition = { !appState.hasUser }>
                    <RegisterForm appState = { appState }/>
                </When>

                <When condition = { !appState.isLoggedIn }>
                    <LoginForm appState = { appState }/>
                </When>

                <Otherwise>
                    <DashboardNavigationBar
                        appState = { appState }
                    />
                    <div style = {{
                        minHeight: '90px',
                    }}>
                        <img 
                            src = { './volwal.png' }
                            style = {{
                                width: '100%',
                                height: 'auto',
                            }}
                        />
                    </div>
                    <NetworkList appState = { appState }/>
                    <DashboardActionsSegment appState = { appState }/>
                </Otherwise>
            </Choose>

        </SingleColumnContainerView>
    );
});
