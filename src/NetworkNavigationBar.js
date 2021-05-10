// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { NavigationBar }                    from './NavigationBar';
import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import { Redirect }                         from 'react-router';
import { Link }                             from 'react-router-dom';
import { Dropdown, Icon, Label, Menu }      from 'semantic-ui-react';

export const NETWORK_TABS = {
    NETWORK:            'NETWORK',
    CHAIN:              'CHAIN',
    CONSENSUS:          'CONSENSUS',
};

//----------------------------------------------------------------//
function getAccountTabTitle ( tab ) {

    switch ( tab ) {
        case NETWORK_TABS.NETWORK:              return 'Accounts';
        case NETWORK_TABS.CHAIN:                return 'Chain';
        case NETWORK_TABS.CONSENSUS:            return 'Consensus';
    }
    return '';
};

//----------------------------------------------------------------//
function getNetworkTabURL ( tab ) {

    switch ( tab ) {
        case NETWORK_TABS.NETWORK:              return '';
        case NETWORK_TABS.CHAIN:                return '/chain';
        case NETWORK_TABS.CONSENSUS:            return '/consensus';
    }
    return '/';
};

//================================================================//
// NetworkNavigationBar
//================================================================//
export const NetworkNavigationBar = observer (( props ) => {

    const { networkService, navTitle, networkID, tab } = props;

    const chainURL          = `/net/${ networkID }${ getNetworkTabURL ( NETWORK_TABS.CHAIN )}`;
    const networkURL        = `/net/${ networkID }${ getNetworkTabURL ( NETWORK_TABS.NETWORK )}`;
    const consensusURL      = `/net/${ networkID }${ getNetworkTabURL ( NETWORK_TABS.CONSENSUS )}`;

    const networkTab            = getNetworkTabURL ( tab );

    if ( networkService.networkID !== networkID ) {
        return (<Redirect to = { `/net/${ networkService.networkID }${ networkTab }` }/>);
    }

    return (
        <React.Fragment>

            <NavigationBar
                networkService  = { networkService }
                networkID       = { networkID }
                networkTab      = { networkTab }
                accountID       = { '' }
            />

            <Menu borderless attached = 'bottom'>
                <Dropdown item text = { getAccountTabTitle ( tab )} style = {{ textTransform: 'uppercase' }}>
                    <Dropdown.Menu>

                        <Dropdown.Item text = { getAccountTabTitle ( NETWORK_TABS.NETWORK )} as = { Link } to = { networkURL }/>
                        <Dropdown.Item text = { getAccountTabTitle ( NETWORK_TABS.CONSENSUS )} as = { Link } to = { consensusURL }/>

                        <If condition = { false }>
                            <Dropdown.Item text = { getAccountTabTitle ( NETWORK_TABS.CHAIN )} as = { Link } to = { chainURL }/>
                        </If>
                    </Dropdown.Menu>
                </Dropdown>
            </Menu>
        </React.Fragment>
    );
});
