// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AccountNavigationBar, ACCOUNT_TABS }               from './AccountNavigationBar';
import { AppStateService }                                  from './services/AppStateService';
import { ShopScreenFancy }                                  from './ShopScreenFancy';
import { ShopScreenSimple }                                 from './ShopScreenSimple';
import * as fgc                                             from 'fgc';
import { action, computed, observable }                     from 'mobx';
import { observer }                                         from 'mobx-react';
import React, { useState }                                  from 'react';
import { Redirect }                                         from 'react-router';
import * as UI                                              from 'semantic-ui-react';
import * as vol                                             from 'vol';

const appState = AppStateService.get ();

//================================================================//
// ShopScreen
//================================================================//
export const ShopScreen = observer (( props ) => {

    if ( AppStateService.needsReset ()) return (<Redirect to = { '/util/reset' }/>);

    const networkIDFromEndpoint     = fgc.util.getMatch ( props, 'networkID' );
    const networkService            = appState.assertNetworkService ( networkIDFromEndpoint );

    return (
        <Choose>
            <When condition = { networkService.marketplaceURL }>
                <ShopScreenFancy { ...props }/>
            </When>
            <Otherwise>
                <ShopScreenSimple { ...props }/>
            </Otherwise>
        </Choose>
    );
});
