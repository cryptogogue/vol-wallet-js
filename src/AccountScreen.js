// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AppStateService }                  from './AppStateService';
import { TransactionModal }                 from './TransactionModal';
import { assert, excel, hooks, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import { action, computed, extendObservable, observable, observe } from 'mobx';
import { observer }                         from 'mobx-react';
import React, { useState, useRef }          from 'react';
import { Redirect }                         from 'react-router';
import { useParams }                        from 'react-router-dom';
import * as UI                              from 'semantic-ui-react';

import { AccountNavigationBar, ACCOUNT_TABS } from './AccountNavigationBar';
import { AccountInfoService }               from './AccountInfoService';

//================================================================//
// AccountDetailsView
//================================================================//
const AccountDetailsView = observer (( props ) => {

    const { appState }  = props;
    const account       = appState.account;

    if ( !account ) return;

    const accountURL    = `${ appState.network.nodeURL }/accounts/${ appState.accountID }`;
    const hasInfo       = appState.hasAccountInfo;
    
    return (
        <div style = {{ textAlign: 'center' }}>

            <UI.Header as = "h2" icon>
                <Choose>
                    <When condition = { hasInfo }>
                        <UI.Icon name = 'trophy' circular />
                    </When>
                    <Otherwise>
                        <UI.Icon name = 'circle notched' loading circular/>
                    </Otherwise>
                </Choose>
                <a href = { accountURL } target = '_blank'>{ appState.accountID }</a>
            </UI.Header>

            <div style = {{ display: hasInfo ? 'visible' : 'hidden' }}>
                <UI.Header as = 'h3'>
                    { `Balance: ${ appState.balance }` }
                </UI.Header>

                <UI.Header.Subheader>
                    { `Nonce: ${ appState.nonce }` }
                </UI.Header.Subheader>
                </div>
        </div>
    );
});

//================================================================//
// AccountActionsSegment
//================================================================//
export const AccountActionsSegment = observer (( props ) => {

    const { appState } = props;

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
                    attached = 'bottom'
                    onClick = {() => { setTransactionModalOpen ( true )}}
                >
                    <UI.Icon name = 'envelope'/>
                    New Transaction
                </UI.Button>
            </UI.Segment>

            <TransactionModal
                appState = { appState }
                open = { transactionModalOpen }
                onClose = {() => { setTransactionModalOpen ( false )}}
            />
        </div>
    );
});

//================================================================//
// AccountScreen
//================================================================//
export const AccountScreen = observer (( props ) => {

    const networkID = util.getMatch ( props, 'networkID' );
    const accountID = util.getMatch ( props, 'accountID' );

    const appState              = hooks.useFinalizable (() => new AppStateService ( networkID, accountID ));
    const accountInfoService    = hooks.useFinalizable (() => new AccountInfoService ( appState ));

    return (
        <SingleColumnContainerView>

            <AccountNavigationBar
                appState    = { appState }
                tab         = { ACCOUNT_TABS.ACCOUNT }
            />

            <If condition = { appState.hasAccount }>

                <UI.Segment>
                    <AccountDetailsView appState = { appState }/>
                </UI.Segment>

                <AccountActionsSegment appState = { appState }/>
            </If>

        </SingleColumnContainerView>
    );
});
