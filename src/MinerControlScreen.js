// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { ControlCommandModal }                              from './control-commands/ControlCommandModal';
import { ImportMinerControlKeyModal }                       from './ImportMinerControlKeyModal';
import { NetworkNavigationBar, NETWORK_TABS }               from './NetworkNavigationBar';
import { NetworkStateService }                              from './services/NetworkStateService';
import { AppStateService }                                  from './services/AppStateService';
import { WarnAndDeleteModal }                               from './WarnAndDeleteModal';
import { ScannerReportModal, SchemaScannerXLSX }            from 'cardmotron';
import _                                                    from 'lodash';
import { assert, ClipboardMenuItem, excel, FilePickerMenuItem, hooks, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import { css }                                              from 'glamor';
import { action, computed, extendObservable, observable }   from "mobx";
import { observer }                                         from 'mobx-react';
import React, { Fragment, useState, useRef }                from 'react';
import JSONTree                                             from 'react-json-tree';
import { Link }                                             from 'react-router-dom';
import * as UI                                              from 'semantic-ui-react';

const REQUEST_DELETE_WARNING_0 = `
    This will delete the miner control key stored in your wallet.
`;

//================================================================//
// MinerControlActionsSegment
//================================================================//
export const MinerControlActionsSegment = observer (( props ) => {

    const { appState } = props;

    const [ controlCommandModalOpen, setControlCommandModalOpen ] = useState ( false );

    return (
        <React.Fragment>

            <UI.Segment>
                <UI.Button
                    fluid
                    color = 'red'
                    onClick = {() => { setControlCommandModalOpen ( true )}}
                >
                    <UI.Icon name = 'envelope'/>
                    New Miner Control Command
                </UI.Button>
            </UI.Segment>

            <ControlCommandModal
                appState = { appState }
                open = { controlCommandModalOpen }
                onClose = {() => { setControlCommandModalOpen ( false )}}
            />

        </React.Fragment>
    );
});

//================================================================//
// MinerControlScreen
//================================================================//
export const MinerControlScreen = observer (( props ) => {

    const [ importKeyModalOpen, setImportKeyModalOpen ] = useState ( false );

    const networkID         = util.getMatch ( props, 'networkID' );
    const appState          = hooks.useFinalizable (() => new AppStateService ());
    const networkServie     = appState.assertNetworkService ( networkID );

    const controlKey = appState.network.controlKey;

    return (
        <SingleColumnContainerView>

            <ImportMinerControlKeyModal
                appState = { appState }
                open = { importKeyModalOpen }
                onClose = {() => { setImportKeyModalOpen ( false )}}
            />

            <NetworkNavigationBar
                appState    = { appState }
                tab         = { NETWORK_TABS.ADMIN }
                networkID   = { networkIDFromEndpoint }
            />

            <Choose>
                <When condition = { controlKey }>

                    <UI.Menu size = 'mini' color = 'grey' attached = 'top' borderless inverted>

                        <UI.Menu.Item
                            icon = 'settings'
                            onClick = {() => { setImportKeyModalOpen ( true )}}
                        />

                        <WarnAndDeleteModal
                            trigger = {
                                <UI.Menu.Item position = 'right'>
                                    <UI.Icon name = 'remove'/>
                                </UI.Menu.Item>
                            }
                            warning0 = { REQUEST_DELETE_WARNING_0 }
                            onDelete = {() => { appState.deleteMinerControlKey ()}}
                        />

                    </UI.Menu>

                    <UI.Segment style = {{ wordWrap: 'break-word' }} attached = 'bottom' >
                        { controlKey.publicKeyHex }
                    </UI.Segment>

                    <MinerControlActionsSegment appState = { appState }/>

                </When>

                <Otherwise>
                    <UI.Segment>
                        <UI.Button
                            fluid
                            color = 'red'
                            onClick = {() => { setImportKeyModalOpen ( true )}}
                        >
                            <UI.Icon name = 'key'/>
                            Import Miner Control Key
                        </UI.Button>
                    </UI.Segment>
                </Otherwise>
            </Choose>

        </SingleColumnContainerView>
    );
});
