// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AccountLogLabel }                  from './AccountLogLabel';
import { ConsensusWarning }                 from './ConsensusWarning';
import { InboxLabel }                       from './InboxLabel';
import { InventoryWarning }                 from './InventoryWarning';
import { NavigationBar }                    from './NavigationBar';
import { NetworkNavigationBar, getNetworkTabTitle, getNetworkTabURL, NETWORK_TABS } from './NetworkNavigationBar';
import { TransactionQueueLabel }            from './TransactionQueueLabel';
import { observer }                         from 'mobx-react';
import React                                from 'react';
import { Redirect }                         from 'react-router';
import { Link, useParams }                  from 'react-router-dom';
import * as UI                              from 'semantic-ui-react';

export const ACCOUNT_TABS = {
    ACCOUNT:        'ACCOUNT',
    INVENTORY:      'INVENTORY',
    KEYS:           'KEYS',
    MINER:          'MINER',
    SHOP:           'SHOP',
};

//----------------------------------------------------------------//
export function getAccountTabTitle ( tab ) {

    switch ( tab ) {
        case ACCOUNT_TABS.ACCOUNT:      return 'Account';
        case ACCOUNT_TABS.INVENTORY:    return 'Inventory';
        case ACCOUNT_TABS.KEYS:         return 'Keys';
        case ACCOUNT_TABS.MINER:        return 'Miner';
        case ACCOUNT_TABS.SHOP:         return 'Shop';
    }
    return '';
};

//----------------------------------------------------------------//
export function getAccountTabURL ( tab ) {

    switch ( tab ) {
        case ACCOUNT_TABS.ACCOUNT:      return '';
        case ACCOUNT_TABS.INVENTORY:    return '/inventory';
        case ACCOUNT_TABS.KEYS:         return '/keys';
        case ACCOUNT_TABS.MINER:        return '/miner';
        case ACCOUNT_TABS.SHOP:         return '/shop';
    }
    return '/';
};

//================================================================//
// AccountNavigationBar
//================================================================//
export const AccountNavigationBar = observer (( props ) => {

    const params = useParams ();

    const networkID = params.networkID || '';
    const accountID = params.accountID || '';

    const { accountService, tab } = props;

    const accountURL            = `/net/${ networkID }/account/${ accountID }${ getAccountTabURL ( ACCOUNT_TABS.ACCOUNT )}`;
    const inventoryURL          = `/net/${ networkID }/account/${ accountID }${ getAccountTabURL ( ACCOUNT_TABS.INVENTORY )}`;
    const keysURL               = `/net/${ networkID }/account/${ accountID }${ getAccountTabURL ( ACCOUNT_TABS.KEYS )}`;
    const minerURL              = `/net/${ networkID }/account/${ accountID }${ getAccountTabURL ( ACCOUNT_TABS.MINER )}`;
    const shopURL               = `/net/${ networkID }/account/${ accountID }${ getAccountTabURL ( ACCOUNT_TABS.SHOP )}`;

    const accountsURL           = `/net/${ networkID }${ getNetworkTabURL ( NETWORK_TABS.ACCOUNTS )}`;
    const chainURL              = `/net/${ networkID }${ getNetworkTabURL ( NETWORK_TABS.CHAIN )}`;
    const servicesURL           = `/net/${ networkID }${ getNetworkTabURL ( NETWORK_TABS.SERVICES )}`;
    const consensusURL          = `/net/${ networkID }${ getNetworkTabURL ( NETWORK_TABS.CONSENSUS )}`;
    const termsURL              = `/net/${ networkID }${ getNetworkTabURL ( NETWORK_TABS.TERMS_OF_SERVICE )}`;

    const accountTab            = getAccountTabURL ( tab );

    if ( accountService.accountID !== accountID ) {
        return (<Redirect to = { `/net/${ accountService.networkService.networkID }/account/${ accountService.accountID }${ accountTab }` }/>);
    }

    return (
        <React.Fragment>
            <NavigationBar
                networkService      = { accountService.networkService }
                networkID           = { networkID }
                accountID           = { accountID }
                accountTab          = { accountTab }
            />

            <UI.Menu borderless attached = 'bottom'>

                <UI.Dropdown item text = { getAccountTabTitle ( tab )} style = {{ textTransform: 'uppercase' }}>
                    <UI.Dropdown.Menu>
                        <UI.Dropdown.Item text = { getAccountTabTitle ( ACCOUNT_TABS.ACCOUNT )}     as = { Link } to = { accountURL }/>
                        <UI.Dropdown.Item text = { getAccountTabTitle ( ACCOUNT_TABS.KEYS )}        as = { Link } to = { keysURL }/>
                        <UI.Dropdown.Item text = { getAccountTabTitle ( ACCOUNT_TABS.INVENTORY )}   as = { Link } to = { inventoryURL }/>
                        <UI.Dropdown.Item text = { getAccountTabTitle ( ACCOUNT_TABS.SHOP )}        as = { Link } to = { shopURL }/>

                        <If condition = { accountService.isMiner }>
                            <UI.Dropdown.Item text = { getAccountTabTitle ( ACCOUNT_TABS.MINER )}   as = { Link } to = { minerURL }/>
                        </If>

                        <UI.Dropdown.Divider/>

                        <UI.Dropdown.Item text = { getNetworkTabTitle ( NETWORK_TABS.ACCOUNTS )}            as = { Link } to = { accountsURL }/>
                        <UI.Dropdown.Item text = { getNetworkTabTitle ( NETWORK_TABS.SERVICES )}            as = { Link } to = { servicesURL }/>
                        <UI.Dropdown.Item text = { getNetworkTabTitle ( NETWORK_TABS.CONSENSUS )}           as = { Link } to = { consensusURL }/>
                        <UI.Dropdown.Item text = { getNetworkTabTitle ( NETWORK_TABS.TERMS_OF_SERVICE )}    as = { Link } to = { termsURL }/>

                    </UI.Dropdown.Menu>
                </UI.Dropdown>

                <UI.Menu.Menu position = 'right'>
                    <UI.Menu.Item>
                        <InboxLabel accountService = { accountService }/>
                        <TransactionQueueLabel accountService = { accountService }/>
                        <AccountLogLabel accountService = { accountService }/>
                    </UI.Menu.Item>
                </UI.Menu.Menu>
            </UI.Menu>

            <ConsensusWarning networkService = { accountService.networkService }/>
            <InventoryWarning inventoryService = { accountService.inventoryService }/>
        </React.Fragment>
    );
});
