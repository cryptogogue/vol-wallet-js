// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AccountList }                      from './AccountList';
import { ImportAccountModal }               from './ImportAccountModal';
import { NetworkNavigationBar, NETWORK_TABS } from './NetworkNavigationBar';
import { PendingAccountList }               from './PendingAccountList';
import { RequestAccountModal }              from './RequestAccountModal';
import { AppStateService }                  from './services/AppStateService';
import * as fgc                             from 'fgc';
import { observer }                         from 'mobx-react';
import React, { useState, useRef }          from 'react';
import { Redirect }                         from 'react-router';
import * as UI                              from 'semantic-ui-react';

const appState = AppStateService.get ();

//================================================================//
// ServicesScreen
//================================================================//
export const ServicesScreen = observer (( props ) => {

    if ( AppStateService.needsReset ()) return (<Redirect to = { '/util/reset' }/>);

    const networkIDFromEndpoint         = fgc.util.getMatch ( props, 'networkID' );
    const networkService                = appState.assertNetworkService ( networkIDFromEndpoint );
    const [ mktError, setMktError ]     = useState ( false );
    const [ isBusy, setIsBusy ]         = useState ( false );

    const onMarketplaceURLAsync = async ( url ) => {

        setIsBusy ( true );
        try {
            const result = await networkService.revocable.fetchJSON ( url );
            console.log ( result );
            if ( result && ( result.type === 'VOL_QUERY' )) {
                networkService.setMarketplaceURL ( url );
            }
            else {
                setMktError ( 'Not a Volition marketplace service.' );
            }
        }
        catch ( error ) {
            console.log ( error );
            setMktError ( 'Could not reach URL.' );
        }
        setIsBusy ( false );
    }

    const onMarketplaceURLChange = async ( input ) => {
        setMktError ( false );
        if ( !input ) {
            networkService.setMarketplaceURL ( input );
        }
    }

    return (
        <fgc.SingleColumnContainerView>

            <NetworkNavigationBar
                networkService      = { networkService }
                tab                 = { NETWORK_TABS.SERVICES }
                networkID           = { networkIDFromEndpoint }
            />

            <UI.Segment>
                <fgc.URLField
                    fluid
                    label           = 'Markeplace'
                    url             = { networkService.marketplaceURL }
                    onChange        = { onMarketplaceURLChange }
                    onURL           = { onMarketplaceURLAsync }
                    disabled        = { isBusy }
                    error           = { mktError }
                />
            </UI.Segment>

        </fgc.SingleColumnContainerView>
    );
});
