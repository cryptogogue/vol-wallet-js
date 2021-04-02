// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AccountNavigationBar, ACCOUNT_TABS }               from './AccountNavigationBar';
import { KeyInfoMessage }                                   from './KeyInfoMessage';
import { AccountStateService }                              from './services/AccountStateService';
import { AppStateService }                                  from './services/AppStateService';
import { assert, excel, hooks, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import _                                                    from 'lodash';
import { action, computed, extendObservable, observable }   from "mobx";
import { observer }                                         from 'mobx-react';
import React, { useState }                                  from 'react';
import { Link }                                             from 'react-router-dom';
import * as UI                                              from 'semantic-ui-react';

//================================================================//
// KeysScreen
//================================================================//
export const KeysScreen = observer (( props ) => {

    const networkIDFromEndpoint = util.getMatch ( props, 'networkID' );
    const accountIDFromEndpoint = util.getMatch ( props, 'accountID' );

    const appState          = hooks.useFinalizable (() => new AppStateService ());
    const accountService    = hooks.useFinalizable (() => new AccountStateService ( appState, networkIDFromEndpoint, accountIDFromEndpoint ));

    const keys = [];
    for ( let keyName in accountService.account.keys ) {
        keys.push (
            <KeyInfoMessage
                key                 = { keyName }
                accountService      = { accountService }
                keyName             = { keyName }
            />
        );
    }

    return (
        <SingleColumnContainerView>

            <AccountNavigationBar
                accountService      = { accountService }
                tab                 = { ACCOUNT_TABS.KEYS }
            />

            <UI.List>
                { keys }
            </UI.List>
        </SingleColumnContainerView>
    );
});
