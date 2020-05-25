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
// AccountDebugScreen
//================================================================//
export const AccountDebugScreen = observer (( props ) => {

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
                <UI.Button
                    fluid
                    color       = 'teal'
                    onClick     = {() => { appState.setAccountInventoryNonce ( 0 )}}
                >
                    Reset Inventory Nonce
                </UI.Button>
            </If>

        </SingleColumnContainerView>
    );
});
