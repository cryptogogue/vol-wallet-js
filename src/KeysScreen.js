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
import { Redirect }                                         from 'react-router';
import { Link }                                             from 'react-router-dom';
import * as UI                                              from 'semantic-ui-react';

//================================================================//
// KeysScreen
//================================================================//
export const KeysScreen = observer (( props ) => {

    if ( AppStateService.needsReset ()) return (<Redirect to = { '/util/reset' }/>);

    const networkID         = util.getMatch ( props, 'networkID' );
    const accountID         = util.getMatch ( props, 'accountID' );

    const appState          = hooks.useFinalizable (() => new AppStateService ());
    const accountService    = appState.assertAccountService ( networkID, accountID );

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
