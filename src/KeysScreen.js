// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AccountNavigationBar, ACCOUNT_TABS }               from './AccountNavigationBar';
import { AppStateService }                                  from './AppStateService';
import { KeyInfoMessage }                                    from './KeyInfoMessage';
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

    const appState      = hooks.useFinalizable (() => new AppStateService ( networkIDFromEndpoint, accountIDFromEndpoint ));

    const keys = [];
    for ( let keyName in appState.account.keys ) {
        keys.push (
            <KeyInfoMessage
                key = { keyName }
                appState = { appState }
                keyName = { keyName }
            />
        );
    }

    return (
        <SingleColumnContainerView>

            <AccountNavigationBar
                appState    = { appState }
                tab         = { ACCOUNT_TABS.KEYS }
            />

            <UI.List>
                { keys }
            </UI.List>
        </SingleColumnContainerView>
    );
});
