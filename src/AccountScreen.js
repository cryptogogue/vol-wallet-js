// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AccountStateService }              from './services/AccountStateService';
import { AppStateService }                  from './services/AppStateService';
import { TransactionModal }                 from './transactions/TransactionModal';
import * as vol                             from './util/vol';
import { assert, excel, hooks, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import { action, computed, extendObservable, observable, observe } from 'mobx';
import { observer }                         from 'mobx-react';
import React, { useState, useRef }          from 'react';
import { Redirect }                         from 'react-router';
import { useParams }                        from 'react-router-dom';
import * as UI                              from 'semantic-ui-react';

import { AccountNavigationBar, ACCOUNT_TABS } from './AccountNavigationBar';

const appState = AppStateService.get ();

//const debugLog = function () {}
const debugLog = function ( ...args ) { console.log ( 'ACCOUNT SCREEN:', ...args ); }

//================================================================//
// AccountDetailsView
//================================================================//
const AccountDetailsView = observer (( props ) => {

    const { accountService }    = props;
    const networkService        = accountService.networkService;
    const account               = accountService.account;

    if ( !account ) return;

    const consensusService      = networkService.consensusService;
    const accountURL            = networkService.getPrimaryURL ( `/accounts/${ accountService.accountID }`, undefined, true );
    const hasInfo               = accountService.hasAccountInfo && networkService.isCurrent;
    const balance               = accountService.balance;
    const balanceColor          = balance > 0 ? 'black' : 'red';
    const iconName              = accountService.isMiner ? 'gem outline' : 'trophy';

    return (
        <div style = {{ textAlign: 'center' }}>

            <UI.Header as = "h2" icon>
                <Choose>
                    <When condition = { hasInfo }>
                        <UI.Icon name = { iconName } circular />
                    </When>
                    <Otherwise>
                        <UI.Icon name = 'circle notched' loading circular/>
                    </Otherwise>
                </Choose>
                <a href = { accountURL } target = '_blank'>{ accountService.accountID }</a>
            </UI.Header>

            <div style = {{ visibility: hasInfo ? 'visible' : 'hidden' }}>
                <UI.Header as = 'h3' style = {{ color: balanceColor }}>
                    { `Balance: ${ vol.format ( accountService.balance )}` }
                </UI.Header>

                <UI.Header.Subheader>
                    { `Nonce: ${ accountService.nonce }` }
                </UI.Header.Subheader>

                <UI.Header.Subheader>
                    { `Inventory Nonce: ${ accountService.inventoryNonce }` }
                </UI.Header.Subheader>
            </div>

            <UI.Header.Subheader>
                { `Miners: ${ consensusService.currentMiners.length } / ${ consensusService.onlineMiners.length }` }
            </UI.Header.Subheader>

            <UI.Header.Subheader>
                { `Height: ${ networkService.height }` }
            </UI.Header.Subheader>

            <UI.Header.Subheader style = {{ fontSize: 9 }}>
                { `${ networkService.digest }` }
            </UI.Header.Subheader>
        </div>
    );
});

//================================================================//
// AccountActionsSegment
//================================================================//
export const AccountActionsSegment = observer (( props ) => {

    const { accountService } = props;
    const appState = accountService.appState;

    const segmentRef = useRef ();
    const [ transactionModalOpen, setTransactionModalOpen ] = useState ( false );

    return (
        <div ref = { segmentRef }>

            <UI.Popup
                open = {( appState.flags.promptFirstTransaction && !transactionModalOpen ) ? true : false }
                content = 'Create and submit transactions.'
                position = 'bottom center'
                context = { segmentRef }
            />

            <UI.Segment>
                <UI.Button
                    fluid
                    color = 'teal'
                    onClick = {() => { setTransactionModalOpen ( true )}}
                >
                    <UI.Icon name = 'envelope'/>
                    New Transaction
                </UI.Button>
            </UI.Segment>

            <TransactionModal
                accountService  = { accountService }
                open            = { transactionModalOpen }
                onClose         = {() => { setTransactionModalOpen ( false )}}
            />
        </div>
    );
});

//================================================================//
// AccountScreen
//================================================================//
export const AccountScreen = observer (( props ) => {

    if ( AppStateService.needsReset ()) return (<Redirect to = { '/util/reset' }/>);

    console.log ( 'RENDER ACCOUNT SCREEN' );

    const networkID = util.getMatch ( props, 'networkID' );
    const accountID = util.getMatch ( props, 'accountID' );

    const accountService    = appState.assertAccountService ( networkID, accountID );

    return (
        <SingleColumnContainerView>

            <AccountNavigationBar
                accountService      = { accountService }
                tab                 = { ACCOUNT_TABS.ACCOUNT }
            />

            <If condition = { accountService.hasAccount }>

                <UI.Segment>
                    <AccountDetailsView accountService  = { accountService }/>
                </UI.Segment>

                <AccountActionsSegment accountService   = { accountService }/>
            </If>

        </SingleColumnContainerView>
    );
});
