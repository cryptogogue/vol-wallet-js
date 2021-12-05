// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AddNetworkModal }                  from './AddNetworkModal';
import { DashboardNavigationBar }           from './DashboardNavigationBar';
import { LoginForm }                        from './LoginForm';
import { NetworkList }                      from './NetworkList';
import { RegisterForm }                     from './RegisterForm';
import { AppStateService }                  from './services/AppStateService';
import { SingleColumnContainerView }        from 'fgc';
import _                                    from 'lodash';
import { observer }                         from 'mobx-react';
import React, { useState, useRef }          from 'react';
import { Redirect }                         from 'react-router';
import { Link }                             from 'react-router-dom';
import * as UI                              from 'semantic-ui-react';

const appState = AppStateService.get ();

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

    if ( AppStateService.needsReset ()) return (<Redirect to = { '/util/reset' }/>);

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
