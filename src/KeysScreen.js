// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AccountNavigationBar, ACCOUNT_TABS }               from './AccountNavigationBar';
import { KeyInfoMessage }                                   from './KeyInfoMessage';
import { AppStateService }                                  from './services/AppStateService';
import { SingleColumnContainerView, util }                  from 'fgc';
import _                                                    from 'lodash';
import { observer }                                         from 'mobx-react';
import React                                                from 'react';
import { Redirect }                                         from 'react-router';
import * as UI                                              from 'semantic-ui-react';

const appState = AppStateService.get ();

//================================================================//
// KeysScreen
//================================================================//
export const KeysScreen = observer (( props ) => {

    if ( AppStateService.needsReset ()) return (<Redirect to = { '/util/reset' }/>);

    const networkID         = util.getMatch ( props, 'networkID' );
    const accountID         = util.getMatch ( props, 'accountID' );

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
