// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AccountNavigationBar, ACCOUNT_TABS }               from './AccountNavigationBar';
import { ControlCommandModal }                              from './control-commands/ControlCommandModal';
import { ImportMinerControlKeyModal }                       from './ImportMinerControlKeyModal';
import { NetworkStateService }                              from './services/NetworkStateService';
import { AppStateService }                                  from './services/AppStateService';
import { MINER_TRANSACTIONS_MENU }                          from './transactions/TransactionDropdown';
import { TransactionModal }                                 from './transactions/TransactionModal';
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

    const { accountService } = props;

    const [ controlCommandModalOpen, setControlCommandModalOpen ] = useState ( false );
    const [ transactionModalOpen, setTransactionModalOpen ] = useState ( false );

    return (
        <React.Fragment>

            <UI.Segment>
                <UI.Button
                    fluid
                    color       = 'teal'
                    attached    = 'top'
                    onClick     = {() => { setTransactionModalOpen ( true )}}
                >
                    <UI.Icon name = 'envelope'/>
                    New Transaction
                </UI.Button>

                <UI.Button
                    fluid
                    color       = 'teal'
                    attached    = 'bottom'
                    onClick     = {() => { setControlCommandModalOpen ( true )}}
                >
                    <UI.Icon name = 'envelope'/>
                    New Miner Control Command
                </UI.Button>
            </UI.Segment>

            <TransactionModal
                accountService  = { accountService }
                open            = { transactionModalOpen }
                onClose         = {() => { setTransactionModalOpen ( false )}}
                menu            = { MINER_TRANSACTIONS_MENU }
            />

            <ControlCommandModal
                appState        = { accountService.appState }
                open            = { controlCommandModalOpen }
                onClose         = {() => { setControlCommandModalOpen ( false )}}
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
    const accountID         = util.getMatch ( props, 'accountID' );

    const appState          = hooks.useFinalizable (() => new AppStateService ());
    const accountService    = appState.assertAccountService ( networkID, accountID );

    const controlKey        = accountService.controlKey;

    return (
        <SingleColumnContainerView>

            <ImportMinerControlKeyModal
                accountService  = { accountService }
                open            = { importKeyModalOpen }
                onClose         = {() => { setImportKeyModalOpen ( false )}}
            />

            <AccountNavigationBar
                accountService      = { accountService }
                tab                 = { ACCOUNT_TABS.MINER }
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
                            onDelete = {() => { accountService.deleteMinerControlKey ()}}
                        />

                    </UI.Menu>

                    <UI.Segment style = {{ wordWrap: 'break-word' }} attached = 'bottom' >
                        { controlKey.publicKeyHex }
                    </UI.Segment>

                    <MinerControlActionsSegment accountService = { accountService }/>

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
