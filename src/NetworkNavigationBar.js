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
        case NETWORK_TABS.NETWORK:              return 'Network';
        case NETWORK_TABS.CHAIN:                return 'Chain';
    }
    return '';
};

//----------------------------------------------------------------//
function getAccountTabURL ( tab ) {

    switch ( tab ) {
        case NETWORK_TABS.NETWORK:              return '';
        case NETWORK_TABS.CHAIN:                return '/chain';
    }
    return '/';
};

//================================================================//
// NetworkNavigationBar
//================================================================//
export const NetworkNavigationBar = observer (( props ) => {

    const { appState, navTitle, networkID, tab } = props;

    const chainURL              = `/net/${ networkID }${ getAccountTabURL ( NETWORK_TABS.CHAIN )}`;
    const networkURL            = `/net/${ networkID }${ getAccountTabURL ( NETWORK_TABS.NETWORK )}`;

    return (
        <React.Fragment>
            <NavigationBar
                appState    = { appState }
                networkID   = { networkID }
                networkTab  = { getAccountTabURL ( tab )}
                accountID   = { '' }
            />

            <Menu borderless attached = 'bottom'>

                <Dropdown item text = { getAccountTabTitle ( tab )} style = {{ textTransform: 'uppercase' }}>
                    <Dropdown.Menu>
                        <Dropdown.Item text = { getAccountTabTitle ( NETWORK_TABS.NETWORK )} as = { Link } to = { networkURL }/>
                        <If condition = { false }>
                            <Dropdown.Item text = { getAccountTabTitle ( NETWORK_TABS.CHAIN )} as = { Link } to = { chainURL }/>
                        </If>
                    </Dropdown.Menu>
                </Dropdown>

            </Menu>
        </React.Fragment>
    );
});
