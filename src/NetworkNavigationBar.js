// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { ConsensusWarning }                 from './ConsensusWarning';
import { NavigationBar }                    from './NavigationBar';
import { observer }                         from 'mobx-react';
import React                                from 'react';
import { Redirect }                         from 'react-router';
import { Link }                             from 'react-router-dom';
import * as UI                              from 'semantic-ui-react';

export const NETWORK_TABS = {
    ACCOUNTS:           'ACCOUNTS',
    SERVICES:           'SERVICES',
    CHAIN:              'CHAIN',
    CONSENSUS:          'CONSENSUS',
    TERMS_OF_SERVICE:   'TERMS_OF_SERVICE',
};

//----------------------------------------------------------------//
export function getNetworkTabTitle ( tab ) {

    switch ( tab ) {
        case NETWORK_TABS.ACCOUNTS:             return 'Accounts';
        case NETWORK_TABS.SERVICES:             return 'Services';
        case NETWORK_TABS.CHAIN:                return 'Chain';
        case NETWORK_TABS.CONSENSUS:            return 'Consensus';
        case NETWORK_TABS.TERMS_OF_SERVICE:     return 'Terms of Service';
    }
    return '';
};

//----------------------------------------------------------------//
export function getNetworkTabURL ( tab ) {

    switch ( tab ) {
        case NETWORK_TABS.ACCOUNTS:             return '';
        case NETWORK_TABS.SERVICES:             return '/services';
        case NETWORK_TABS.CHAIN:                return '/chain';
        case NETWORK_TABS.CONSENSUS:            return '/consensus';
        case NETWORK_TABS.TERMS_OF_SERVICE:     return '/terms';
    }
    return '/';
};

//================================================================//
// NetworkNavigationBar
//================================================================//
export const NetworkNavigationBar = observer (( props ) => {

    const { networkService, navTitle, networkID, tab } = props;

    const accountsURL       = `/net/${ networkID }${ getNetworkTabURL ( NETWORK_TABS.ACCOUNTS )}`;
    const servicesURL       = `/net/${ networkID }${ getNetworkTabURL ( NETWORK_TABS.SERVICES )}`;
    const chainURL          = `/net/${ networkID }${ getNetworkTabURL ( NETWORK_TABS.CHAIN )}`;
    const consensusURL      = `/net/${ networkID }${ getNetworkTabURL ( NETWORK_TABS.CONSENSUS )}`;
    const termsURL          = `/net/${ networkID }${ getNetworkTabURL ( NETWORK_TABS.TERMS_OF_SERVICE )}`;

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

            <UI.Menu borderless attached = 'bottom'>
                <UI.Dropdown item text = { getNetworkTabTitle ( tab )} style = {{ textTransform: 'uppercase' }}>
                    <UI.Dropdown.Menu>

                        <UI.Dropdown.Item text = { getNetworkTabTitle ( NETWORK_TABS.ACCOUNTS )}            as = { Link } to = { accountsURL }/>
                        <UI.Dropdown.Item text = { getNetworkTabTitle ( NETWORK_TABS.SERVICES )}            as = { Link } to = { servicesURL }/>
                        <UI.Dropdown.Item text = { getNetworkTabTitle ( NETWORK_TABS.CONSENSUS )}           as = { Link } to = { consensusURL }/>
                        <UI.Dropdown.Item text = { getNetworkTabTitle ( NETWORK_TABS.TERMS_OF_SERVICE )}    as = { Link } to = { termsURL }/>

                        <If condition = { false }>
                            <UI.Dropdown.Item text = { getNetworkTabTitle ( NETWORK_TABS.CHAIN )}           as = { Link } to = { chainURL }/>
                        </If>
                    </UI.Dropdown.Menu>
                </UI.Dropdown>
            </UI.Menu>

            <ConsensusWarning networkService = { networkService }/>
        </React.Fragment>
    );
});
