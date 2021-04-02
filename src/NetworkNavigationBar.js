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
};

//----------------------------------------------------------------//
function getAccountTabTitle ( tab ) {

    switch ( tab ) {
        case NETWORK_TABS.NETWORK:              return 'Accounts';
        case NETWORK_TABS.CHAIN:                return 'Chain';
        case NETWORK_TABS.ADMIN:                return 'Admin';
    }
    return '';
};

//----------------------------------------------------------------//
function getAccountTabURL ( tab ) {

    switch ( tab ) {
        case NETWORK_TABS.NETWORK:              return '';
        case NETWORK_TABS.CHAIN:                return '/chain';
        case NETWORK_TABS.ADMIN:                return '/admin';
    }
    return '/';
};

//================================================================//
// NetworkNavigationBar
//================================================================//
export const NetworkNavigationBar = observer (( props ) => {

    const { networkService, navTitle, networkID, tab } = props;

    const adminURL              = `/net/${ networkID }${ getAccountTabURL ( NETWORK_TABS.ADMIN )}`;
    const chainURL              = `/net/${ networkID }${ getAccountTabURL ( NETWORK_TABS.CHAIN )}`;
    const networkURL            = `/net/${ networkID }${ getAccountTabURL ( NETWORK_TABS.NETWORK )}`;

    const controlKey = networkService.network.controlKey;

    return (
        <React.Fragment>

            <NavigationBar
                networkService  = { networkService }
                networkID       = { networkID }
                networkTab      = { getAccountTabURL ( tab )}
                accountID       = { '' }
            />

            <Menu borderless attached = 'bottom'>

                <Dropdown item text = { getAccountTabTitle ( tab )} style = {{ textTransform: 'uppercase' }}>
                    <Dropdown.Menu>

                        <Dropdown.Item text = { getAccountTabTitle ( NETWORK_TABS.NETWORK )} as = { Link } to = { networkURL }/>
                        
                        <If condition = { false }>
                            <Dropdown.Item text = { getAccountTabTitle ( NETWORK_TABS.CHAIN )} as = { Link } to = { chainURL }/>
                        </If>

                        <If condition = { controlKey }>
                            <Dropdown.Item text = { getAccountTabTitle ( NETWORK_TABS.ADMIN )} as = { Link } to = { adminURL }/>
                        </If>
                    </Dropdown.Menu>
                </Dropdown>

            </Menu>
        </React.Fragment>
    );
});
