// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { ResetController }                  from './ResetController';
import { hooks }                            from 'fgc';
import { observer }                         from 'mobx-react';
import React                                from 'react';
import { Redirect }                         from 'react-router';
import { Link, useParams }                  from 'react-router-dom';
import { Dropdown, Menu }                   from 'semantic-ui-react';

//const debugLog = function () {}
const debugLog = function ( ...args ) { console.log ( '@NAV:', ...args ); }

//================================================================//
// NavigationBar
//================================================================//
export const NavigationBar = observer (( props ) => {

    const params            = useParams ();

    const networkID         = params.networkID || '';
    const accountID         = params.accountID || '';

    const accountTab        = props.accountTab || '';
    const networkTab        = props.networkTab || '';

    const networkService    = props.networkService || false;
    const appState          = props.appState || networkService.appState;

    const checkForReset = () => {

        if ( !( appState.hasUser && appState.isLoggedIn )) return true;
        if ( networkID && networkService && !appState.hasNetwork ( networkID )) return true;
        if ( accountID && networkService && !networkService.hasAccount ( accountID )) return true;

        return false;
    }

    const resetController   = hooks.useFinalizable (() => new ResetController ( appState, checkForReset ));

    if ( checkForReset () || resetController.reset || !appState.isLoggedIn ) return (<Redirect to = { '/' }/>);

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

    if ( networkService ) {
        debugLog ( 'HAS NETWORK SERVICE' );

        const accounts = networkService.accounts;
        for ( let accountID in accounts ) {
            debugLog ( 'DROPDOWN', accountID )
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
