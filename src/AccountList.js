// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import './PollingList.css';

import { WarnAndDeleteModal }               from './WarnAndDeleteModal';
// import * as bitcoin                         from 'bitcoinjs-lib';
import _                                    from 'lodash';
import { observer }                         from 'mobx-react';
import React                                from 'react';
import { Link }                             from 'react-router-dom';
import * as UI                              from 'semantic-ui-react';
import * as vol                             from 'vol';

const ACCOUNT_DELETE_WARNING_0 = `
    Deleting an account will also delete all locally stored private
    keys. Be sure you have a backup or your private keys
    will be lost forever. This cannot be undone.
`;

const ACCOUNT_DELETE_WARNING_1 = `
    If you lose your private keys, your assets and accounts cannot ever
    be recovered. By anyone. Do you understand?
`;

//================================================================//
// AccountList
//================================================================//
export const AccountList = observer (( props ) => {

    const { networkService } = props;


    const onlineIcon = props.onlineIcon || 'check circle';

    const list = [];
    for ( let accountID in networkService.accounts ) {

        const accountService    = networkService.accounts [ accountID ];
        const iconName          = accountService.isMiner ? 'gem outline' : 'trophy';
        const balance           = accountService ? accountService.balance : 0;
        const balanceColor      = accountService && balance <= 0 ? 'red' : undefined;

        const onDelete = () => {
            networkService.deleteAccount ( accountID );
        }

        list.push (
            <UI.Message
                key             = { accountID }
                icon
                positive
            >
                <Choose>
                    <When condition = { !accountService.hasAccountInfo }>
                        <UI.Icon name = 'circle notched' loading/>
                    </When>

                    <Otherwise>
                        <UI.Icon name = { iconName }/>
                    </Otherwise>
                </Choose>

                <UI.Message.Content>

                    <WarnAndDeleteModal
                        trigger = {
                            <UI.Icon name = 'window close'/>
                        }
                        warning0 = { ACCOUNT_DELETE_WARNING_0 }
                        warning1 = { ACCOUNT_DELETE_WARNING_1 }
                        onDelete = { onDelete }
                    />

                    <UI.Message.Header
                        as = { Link }
                        to = { `/net/${ networkService.networkID }/account/${ accountID }` }
                    >
                        { `Account: ${ accountID }` }
                    </UI.Message.Header>

                    <div style = {{ color: balanceColor }}>
                        { `Balance: ${ accountService.hasAccountInfo ? vol.util.format ( accountService.balance ) : '--' }` }
                    </div>

                </UI.Message.Content>
            </UI.Message>
        );
    }

    return (
        <UI.List>
            { list }
        </UI.List>
    );
});
