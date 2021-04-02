// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { InboxLabel }                       from './InboxLabel';
import { NavigationBar }                    from './NavigationBar';
import { TransactionQueueLabel }            from './TransactionQueueLabel';
import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import { Redirect }                         from 'react-router';
import { Link, useParams }                  from 'react-router-dom';
import { Button, Dropdown, Header, Icon, Label, Menu } from 'semantic-ui-react';

export const ACCOUNT_TABS = {
    ACCOUNT:        'ACCOUNT',
    INVENTORY:      'INVENTORY',
    KEYS:           'KEYS',
};

//----------------------------------------------------------------//
function getAccountTabTitle ( tab ) {

    switch ( tab ) {
        case ACCOUNT_TABS.ACCOUNT:      return 'Account';
        case ACCOUNT_TABS.INVENTORY:    return 'Inventory';
        case ACCOUNT_TABS.KEYS:         return 'Keys';
    }
    return '';
};

//----------------------------------------------------------------//
function getAccountTabURL ( tab ) {

    switch ( tab ) {
        case ACCOUNT_TABS.ACCOUNT:      return '';
        case ACCOUNT_TABS.INVENTORY:    return '/inventory';
        case ACCOUNT_TABS.KEYS:         return '/keys';
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
    const keysURL               = `/net/${ networkID }/account/${ accountID }${ getAccountTabURL ( ACCOUNT_TABS.KEYS )}`;
    const inventoryURL          = `/net/${ networkID }/account/${ accountID }${ getAccountTabURL ( ACCOUNT_TABS.INVENTORY )}`;

    return (
        <React.Fragment>
            <NavigationBar
                networkService      = { accountService.networkService }
                networkID           = { networkID }
                accountID           = { accountID }
                accountTab          = { getAccountTabURL ( tab )}
            />

            <Menu borderless attached = 'bottom'>

                <Dropdown item text = { getAccountTabTitle ( tab )} style = {{ textTransform: 'uppercase' }}>
                    <Dropdown.Menu>
                        <Dropdown.Item text = { getAccountTabTitle ( ACCOUNT_TABS.ACCOUNT )} as = { Link } to = { accountsURL }/>
                        <Dropdown.Item text = { getAccountTabTitle ( ACCOUNT_TABS.KEYS )} as = { Link } to = { keysURL }/>
                        <Dropdown.Item text = { getAccountTabTitle ( ACCOUNT_TABS.INVENTORY )} as = { Link } to = { inventoryURL }/>
                    </Dropdown.Menu>
                </Dropdown>

                <Menu.Menu position = 'right'>
                    <Menu.Item>
                        <InboxLabel accountService = { accountService }/>
                        <TransactionQueueLabel accountService = { accountService }/>
                    </Menu.Item>
                </Menu.Menu>
            </Menu>
        </React.Fragment>
    );
});
