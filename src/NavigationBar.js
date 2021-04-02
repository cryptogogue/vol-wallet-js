// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import { Redirect }                         from 'react-router';
import { Link, useParams }                  from 'react-router-dom';
import { Dropdown, Icon, Label, Menu }      from 'semantic-ui-react';
  
//================================================================//
// NavigationBar
//================================================================//
export const NavigationBar = observer (( props ) => {

    const params = useParams ();

    const networkID = params.networkID || '';
    const accountID = params.accountID || '';

    const accountTab = props.accountTab || '';
    const networkTab = props.networkTab || '';

    const networkService    = props.networkService || false;
    const appState          = props.appState || networkService.appState;

    if ( !appState.hasUser )      return (<Redirect to = { '/' }/>);
    if ( !appState.isLoggedIn )   return (<Redirect to = { '/' }/>);

    // if (( appState.networkID !== networkID ) || ( appState.accountID !== accountID )) {

    //     if ( networkID && accountID ) {
    //         return (<Redirect to = { `/net/${ appState.networkID }/account/${ appState.accountID }${ accountTab }` }/>);
    //     }
    //     if ( networkID ) return (<Redirect to = { `/net/${ appState.networkID }` }/>);
    //     return (<Redirect to = { '/' }/>); 
    // }

    const networkDropdown = [];
    const accountDropdown = [];

    for ( let networkID of appState.networkIDs ) {

        networkDropdown.push (
            <Dropdown.Item
                key         = { networkID }
                as          = { Link }
                to          = { `/net/${ networkID }${ networkTab }` }
            >
                <span className='text'>{ networkID }</span>
            </Dropdown.Item>
        );
    }

    if ( networkService && networkService.network ) {
        const accounts = networkService.network.accounts;
        for ( let accountID in accounts ) {
            accountDropdown.push (
                <Dropdown.Item
                    key         = { accountID }
                    as          = { Link }
                    to          = { `/net/${ networkID }/account/${ accountID }${ accountTab }` }
                >
                    { accountID }
                </Dropdown.Item>
            );
        }
    }

    let onClickLogout = () => { appState.login ()};

    return (
        <Menu attached = 'top' borderless inverted>

            <Menu.Item
                icon        = 'globe'
                as          = { Link }
                to          = { `/` }
            />

            <If condition = { networkDropdown.length > 0 }>
                <Dropdown
                    item
                    text = { networkID }
                    placeholder = '--'
                >
                    <Dropdown.Menu>
                        { networkDropdown }
                    </Dropdown.Menu>
                </Dropdown>

                <If condition = { accountDropdown.length > 0 }>
                    <Dropdown
                        item
                        text = { accountID }
                        placeholder = '--'
                    >
                        <Dropdown.Menu>
                            { accountDropdown }
                        </Dropdown.Menu>
                    </Dropdown>
                </If>
            </If>

            <Menu.Menu position = "right">
                <Menu.Item
                    icon = 'power off'
                    onClick = {() => { onClickLogout ()}}
                />
            </Menu.Menu>
        </Menu>
    );
});
