// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AccountList }                      from './AccountList';
import { ImportAccountModal }               from './ImportAccountModal';
import { NetworkNavigationBar, NETWORK_TABS } from './NetworkNavigationBar';
import { PendingAccountList }               from './PendingAccountList';
import { RequestAccountModal }              from './RequestAccountModal';
import { AppStateService }                  from './services/AppStateService';
import { TermsOfServiceController }         from './TermsOfServiceController';
import { hooks, SingleColumnContainerView, util } from 'fgc';
import { observer }                         from 'mobx-react';
import React, { useState, useRef }          from 'react';
import ReactMarkdown                        from 'react-markdown'
import { Redirect }                         from 'react-router';
import * as UI                              from 'semantic-ui-react';

const appState = AppStateService.get ();

//================================================================//
// TermsOfServiceScreen
//================================================================//
export const TermsOfServiceScreen = observer (( props ) => {

    if ( AppStateService.needsReset ()) return (<Redirect to = { '/util/reset' }/>);

    const networkIDFromEndpoint     = util.getMatch ( props, 'networkID' );
    const networkService            = appState.assertNetworkService ( networkIDFromEndpoint );
    const tosController             = hooks.useFinalizable (() => new TermsOfServiceController ( networkService.consensusService ));

    return (
        <React.Fragment>
            <SingleColumnContainerView>

                <NetworkNavigationBar
                    networkService      = { networkService }
                    tab                 = { NETWORK_TABS.TERMS_OF_SERVICE }
                    networkID           = { networkIDFromEndpoint }
                />

                <If condition = { tosController.isBusy }>
                    <UI.Loader
                        active
                        inline = 'centered'
                        size = 'massive'
                        style = {{ marginTop:'5%' }}
                    >
                        Loading...
                    </UI.Loader>
                </If>

            </SingleColumnContainerView>

            <UI.Container>
                <If condition = { !tosController.isBusy }>
                    <ReactMarkdown>
                        { tosController.text }
                    </ReactMarkdown>
                </If>
            </UI.Container>
        </React.Fragment>
    );
});
