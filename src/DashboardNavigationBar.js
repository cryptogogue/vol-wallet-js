// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { ChangePasswordModal }              from './ChangePasswordModal';
import { NavigationBar }                    from './NavigationBar';
import { WarnAndDeleteModal }               from './WarnAndDeleteModal';
import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import { Redirect }                         from 'react-router';
import { Link }                             from 'react-router-dom';
import { Dropdown, Icon, Label, Menu }      from 'semantic-ui-react';

const STORAGE_DELETE_WARNING_0 = `
    Deleting local storage will delete all private
    keys. Be sure you have a backup or your private keys
    will be lost forever. This cannot be undone.
`;

const STORAGE_DELETE_WARNING_1 = `
    If you lose your private keys, your assets and accounts cannot ever
    be recovered. By anyone. Do you understand?
`;

//================================================================//
// DashboardNavigationBar
//================================================================//
export const DashboardNavigationBar = observer (( props ) => {

    const { appState } = props;
    const [ changePasswordModalOpen, setChangePasswordModalOpen ] = useState ( false );

    const deleteStorageModal = (
        <WarnAndDeleteModal
            trigger = {
                <Dropdown.Item icon = "warning circle" text = 'Delete Local Storage'/>
            }
            warning0 = { STORAGE_DELETE_WARNING_0 }
            warning1 = { STORAGE_DELETE_WARNING_1 }
            onDelete = {() => { appState.deleteStorage ()}}
        />
    );

    return (
        <React.Fragment>
            <NavigationBar
                appState    = { appState }
            />

            <Menu borderless attached = 'bottom'>
                <Menu.Menu position = 'right'>
                    <Dropdown
                        item
                        icon = "settings"
                        disabled = { appState.flags.promptFirstNetwork }
                    >
                        <Dropdown.Menu>
                            <Dropdown.Item icon = "wrench"          text = 'Schema Util'            as = { Link } to = { `/util/schema` }/>
                            <Dropdown.Item icon = "lock"            text = 'Change Password'        onClick = {() => { setChangePasswordModalOpen ( true )}}/>
                            { deleteStorageModal }
                        </Dropdown.Menu>
                    </Dropdown>
                </Menu.Menu>
            </Menu>

            <ChangePasswordModal
                appState    = { appState }
                open        = { changePasswordModalOpen }
                onClose     = {() => { setChangePasswordModalOpen ( false )}}
            />

        </React.Fragment>
    );
});

