// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AccountList }                      from './AccountList';
import { ImportAccountModal }               from './ImportAccountModal';
import { NetworkNavigationBar, NETWORK_TABS } from './NetworkNavigationBar';
import { PendingAccountList }               from './PendingAccountList';
import { RequestAccountModal }              from './RequestAccountModal';
import { AppStateService }                  from './services/AppStateService';
import { NetworkStateService }              from './services/NetworkStateService';
import { assert, excel, hooks, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';
import React, { useState, useRef }          from 'react';
import { Redirect }                         from 'react-router';
import { Link }                             from 'react-router-dom';
import * as UI                              from 'semantic-ui-react';

//================================================================//
// ConsensusScreen
//================================================================//
export const ConsensusScreen = observer (( props ) => {

    if ( AppStateService.needsReset ()) return (<Redirect to = { '/util/reset' }/>);

    const networkIDFromEndpoint     = util.getMatch ( props, 'networkID' );
    const appState                  = hooks.useFinalizable (() => new AppStateService ());
    const networkService            = appState.assertNetworkService ( networkIDFromEndpoint );
    const consensusService          = networkService.consensusService;

    const minerIDs = Object.keys ( consensusService.minersByID );
    minerIDs.sort (( a, b ) => { return a.toLowerCase ().localeCompare ( b.toLowerCase ()); });

    const minerList = [];
    for ( let minerID of minerIDs ) {

        const miner     = consensusService.minersByID [ minerID ];
        const latency   = miner.latency / 1000;
        const ignored   = consensusService.isIgnored ( minerID );

        const onToggle = () => {
            consensusService.toggleIgnored ( minerID );
            networkService.saveConsensusState ();
        }

        minerList.push (
            <UI.Table.Row
                key = { minerID }
                positive    = { miner.online ? true : undefined }
                error       = { !miner.online ? true : undefined }
            >
                <UI.Table.Cell collapsing><UI.Checkbox slider checked = { !ignored } onClick = { onToggle }/></UI.Table.Cell>
                <UI.Table.Cell collapsing><a href = { miner.url } target = '_blank'>{ minerID }</a></UI.Table.Cell>

                <Choose>
                    <When condition = { !ignored }>
                        <UI.Table.Cell collapsing>{ miner.total }</UI.Table.Cell>
                        <UI.Table.Cell collapsing>{ miner.height }</UI.Table.Cell>
                        <UI.Table.Cell collapsing>{ miner.digest }</UI.Table.Cell>
                        <UI.Table.Cell collapsing>{ latency.toFixed ( 2 )}</UI.Table.Cell>
                    </When>
                    <Otherwise>
                        <UI.Table.Cell collapsing>--</UI.Table.Cell>
                        <UI.Table.Cell collapsing>--</UI.Table.Cell>
                        <UI.Table.Cell collapsing>--</UI.Table.Cell>
                        <UI.Table.Cell collapsing>--</UI.Table.Cell>
                    </Otherwise>
                </Choose>
            </UI.Table.Row>
        );
    }

    const percent = ( 1.0 - networkService.serviceCountdown ) * 100;

    const timerSVG = (
        <svg height = "20" width = "20" viewBox = "0 0 20 20">
            <circle r = "10" cx = "10" cy = "10" fill="black" />
            <circle r = "5" cx = "10" cy = "10" fill="transparent"
                stroke = "white"
                strokeWidth = "5"
                strokeDasharray = { `calc(${ percent } * 31.42 / 100) 31.42` }
                transform = "rotate(-90) translate (-20)"
            />
        </svg>
    );

    const onSetThreshold = ( threshold ) => {
        consensusService.setThreshold ( threshold );
        networkService.saveConsensusState ();
    }

    const onSetTimeout = ( timeout ) => {
        consensusService.setTimeout ( timeout * 1000 );
        networkService.saveConsensusState ();
    }

    const onReset = async () => {
        networkService.resetConsensus ();
    }

    return (
        <div>

            <SingleColumnContainerView>
                <NetworkNavigationBar
                    networkService      = { networkService }
                    tab                 = { NETWORK_TABS.CONSENSUS }
                    networkID           = { networkIDFromEndpoint }
                />
            </SingleColumnContainerView>

            <div style = {{ paddingLeft: '20px', paddingRight: '20px' }}>
                <UI.Table unstackable>
                    <UI.Table.Header>
                        <UI.Table.Row>
                            <UI.Table.HeaderCell/>
                            <UI.Table.HeaderCell>Miner ID</UI.Table.HeaderCell>
                            <UI.Table.HeaderCell>Total</UI.Table.HeaderCell>
                            <UI.Table.HeaderCell>Current</UI.Table.HeaderCell>
                            <UI.Table.HeaderCell>Digest</UI.Table.HeaderCell>
                            <UI.Table.HeaderCell>Latency</UI.Table.HeaderCell>
                        </UI.Table.Row>
                    </UI.Table.Header>

                    <UI.Table.Body>
                        { minerList }
                    </UI.Table.Body>


                    <UI.Table.Footer fullWidth>
                        <UI.Table.Row>
                            <UI.Table.HeaderCell colSpan = '6'>

                                <UI.Button
                                    color = 'red'
                                    onClick = { onReset }
                                >
                                    Reset
                                </UI.Button>

                                <span style = {{ paddingLeft: 10, paddingRight: 10, verticalAlign: 'middle' }}>
                                    { timerSVG }
                                </span>

                                <UI.Label pointing = 'right'>Timeout</UI.Label>
                                <UI.Input
                                    type        = 'number'
                                    min         = '0'
                                    step        = '1'
                                    value       = { consensusService.timeout / 1000 }
                                    onChange    = {( event ) => { onSetTimeout ( event.target.value ); }}
                                />

                                <UI.Label pointing = 'right'>Threshold</UI.Label>
                                <UI.Input
                                    type        = 'number'
                                    min         = '0'
                                    max         = '1'
                                    step        = '0.01'
                                    value       = { consensusService.threshold }
                                    onChange    = {( event ) => { onSetThreshold ( event.target.value ); }}
                                />

                            </UI.Table.HeaderCell>
                        </UI.Table.Row>
                    </UI.Table.Footer>


                </UI.Table>
            </div> 

        </div>
    );
});
