// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AddNetworkModal }                  from './AddNetworkModal';
import { PollingList }                      from './PollingList';
import { RegisterForm }                     from './RegisterForm';
import { AppStateService }                  from './services/AppStateService';
import { SingleColumnContainerView }        from 'fgc';
import _                                    from 'lodash';
import { observer }                         from 'mobx-react';
import React, { useState, useRef }          from 'react';
import { Redirect }                         from 'react-router';
import { Link }                             from 'react-router-dom';
import * as UI                              from 'semantic-ui-react';

const appState = AppStateService.get ();

const NETWORK_DELETE_WARNING_0 = `
    Deleting a network will also delete all locally stored accounts and
    private keys. Be sure you have a backup or your private keys
    will be lost forever. This cannot be undone.
`;

const NETWORK_DELETE_WARNING_1 = `
    If you lose your private keys, your assets and accounts cannot ever
    be recovered. By anyone. Do you understand?
`;

//================================================================//
// NetworkList
//================================================================//
export const NetworkList = observer (( props ) => {

    const { appState }  = props;

    const asyncGetInfo = async ( revocable, networkID ) => {
        const networkService = appState.networksByID [ networkID ];
        const info = await revocable.fetchJSON ( networkService.getPrimaryURL ());
        return info && info.type === 'VOL_MINING_NODE' ? info : false;
    }

    const checkIdentifier = ( networkID ) => {
        return _.has ( appState.networksByID, networkID );
    }

    const onDelete = ( networkID ) => {
        appState.deleteNetwork ( networkID );
    }

    const makeItemMessageBody = ( networkID, info ) => {

        console.log ( 'MAKE ITEM MESSAGE BODY:', networkID, info );

        const networkService = appState.networksByID [ networkID ];

        const nodeURL       = networkService.nodeURL;
        const genesis       = `${ networkService.genesis.substring ( 0, 32 )}...`;
        const schema        = info && info.schemaVersion;
        const schemaString  = info ? `Schema ${ schema.major }.${ schema.minor }.${ schema.revision } - "${ schema.release }"` : '';

        return (
            <React.Fragment>
                <UI.Message.Header
                    as = { Link }
                    to = { `/net/${ networkID }` }
                >
                    { networkID }
                </UI.Message.Header>
                <UI.Message.Content>
                    <a href = { nodeURL } target = '_blank'>{ nodeURL }</a>
                    <If condition = { info }>
                        <p style = {{ padding: 0, margin: 0 }}>{ `${ genesis }` }</p>
                        <p style = {{ padding: 0, margin: 0 }}>{ info.build }</p>
                        <p style = {{ padding: 0, margin: 0 }}>{ schemaString }</p>
                    </If>
                </UI.Message.Content>
            </React.Fragment>
        );
    }

    const onlineIcon = ( networkID, info ) => {
        const networkService = appState.networksByID [ networkID ];
        return networkService.network.genesis === info.genesis ? 'check circle' : 'warning sign';
    }

    return (
        <PollingList
            items                   = { appState.networkIDs }
            asyncGetInfo            = { asyncGetInfo }
            checkIdentifier         = { checkIdentifier }
            onlineIcon              = { onlineIcon }
            onDelete                = { onDelete }
            makeItemMessageBody     = { makeItemMessageBody }
            warning0                = { NETWORK_DELETE_WARNING_0 }
            warning1                = { NETWORK_DELETE_WARNING_1 }
        />
    );
});
