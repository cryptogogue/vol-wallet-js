// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { PollingList }                      from './PollingList';
import * as bitcoin                         from 'bitcoinjs-lib';
import { assert, excel, hooks, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import _                                    from 'lodash';
import { action, computed, extendObservable, observable, observe } from 'mobx';
import { observer }                         from 'mobx-react';
import React, { useState, useRef }          from 'react';
import { Link }                             from 'react-router-dom';
import * as UI                              from 'semantic-ui-react';

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

    const asyncGetInfo = async ( revocable, accountID ) => {
        
        let json = await revocable.fetchJSON ( networkService.getServiceURL ( `/accounts/${ accountID }` ));

        if ( !json.account ) {
            const account = networkService.getAccount ( accountID );
            const key = Object.values ( account.keys )[ 0 ];
            const keyID = bitcoin.crypto.sha256 ( key.publicKeyHex ).toString ( 'hex' ).toLowerCase ();
            json = await revocable.fetchJSON ( networkService.getServiceURL ( `/keys/${ keyID }/account` ));
        }
        return json;
    }

    const checkIdentifier = ( accountID ) => {
        return _.has ( networkService.accounts, accountID );
    }

    const onDelete = ( accountID ) => {
        networkService.deleteAccount ( accountID );
    }

    const makeItemMessageBody = ( accountID, info ) => {

        return (
            <React.Fragment>
                <UI.Message.Header
                    as = { Link }
                    to = { `/net/${ networkService.networkID }/account/${ accountID }` }
                >
                    { `Account: ${ accountID }` }
                </UI.Message.Header>
                { `Balance: ${( info && info.account ) ? info.account.balance : '--' }` }
            </React.Fragment>
        );
    }

    const onlineIcon = ( accountID, info ) => {
        return info.miner ? 'gem outline' : 'trophy';
    }

    return (
        <PollingList
            items                   = { _.keys ( networkService.accounts )}
            asyncGetInfo            = { asyncGetInfo }
            checkIdentifier         = { checkIdentifier }
            onlineIcon              = { onlineIcon }
            onDelete                = { onDelete }
            makeItemMessageBody     = { makeItemMessageBody }
            warning0                = { ACCOUNT_DELETE_WARNING_0 }
            warning1                = { ACCOUNT_DELETE_WARNING_1 }
        />
    );
});
