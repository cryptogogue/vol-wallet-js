// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AccountLogLabel }                  from './AccountLogLabel';
import { InboxLabel }                       from './InboxLabel';
import { NavigationBar }                    from './NavigationBar';
import { TransactionQueueLabel }            from './TransactionQueueLabel';
import { observer }                         from 'mobx-react';
import React                                from 'react';
import { Redirect }                         from 'react-router';
import { Link, useParams }                  from 'react-router-dom';
import { Dropdown, Menu }                   from 'semantic-ui-react';

export const ACCOUNT_TABS = {
    ACCOUNT:        'ACCOUNT',
    INVENTORY:      'INVENTORY',
    KEYS:           'KEYS',
    MINER:          'MINER',
    SHOP:           'SHOP',
};

//----------------------------------------------------------------//
function getAccountTabTitle ( tab ) {

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
function getAccountTabURL ( tab ) {

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

    const accountsURL           = `/net/${ networkID }/account/${ accountID }${ getAccountTabURL ( ACCOUNT_TABS.ACCOUNT )}`;
    const inventoryURL          = `/net/${ networkID }/account/${ accountID }${ getAccountTabURL ( ACCOUNT_TABS.INVENTORY )}`;
    const keysURL               = `/net/${ networkID }/account/${ accountID }${ getAccountTabURL ( ACCOUNT_TABS.KEYS )}`;
    const minerURL              = `/net/${ networkID }/account/${ accountID }${ getAccountTabURL ( ACCOUNT_TABS.MINER )}`;
    const shopURL               = `/net/${ networkID }/account/${ accountID }${ getAccountTabURL ( ACCOUNT_TABS.SHOP )}`;

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

            <Menu borderless attached = 'bottom'>

                <Dropdown item text = { getAccountTabTitle ( tab )} style = {{ textTransform: 'uppercase' }}>
                    <Dropdown.Menu>
                        <Dropdown.Item text = { getAccountTabTitle ( ACCOUNT_TABS.ACCOUNT )} as = { Link } to = { accountsURL }/>
                        <Dropdown.Item text = { getAccountTabTitle ( ACCOUNT_TABS.KEYS )} as = { Link } to = { keysURL }/>
                        <Dropdown.Item text = { getAccountTabTitle ( ACCOUNT_TABS.INVENTORY )} as = { Link } to = { inventoryURL }/>
                        <Dropdown.Item text = { getAccountTabTitle ( ACCOUNT_TABS.SHOP )} as = { Link } to = { shopURL }/>

                        <If condition = { accountService.isMiner }>
                            <Dropdown.Item text = { getAccountTabTitle ( ACCOUNT_TABS.MINER )} as = { Link } to = { minerURL }/>
                        </If>
                    </Dropdown.Menu>
                </Dropdown>

                <Menu.Menu position = 'right'>
                    <Menu.Item>
                        <InboxLabel accountService = { accountService }/>
                        <TransactionQueueLabel accountService = { accountService }/>
                        <AccountLogLabel accountService = { accountService }/>
                    </Menu.Item>
                </Menu.Menu>
            </Menu>
        </React.Fragment>
    );
});
