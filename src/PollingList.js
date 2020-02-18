// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import './PollingList.css';

import { AppStateService }                  from './AppStateService';
import { PollingService, POLLING_STATUS }   from './PollingService';
import { WarnAndDeleteModal }               from './WarnAndDeleteModal';
import { assert, excel, hooks, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import _                                    from 'lodash';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';
import React, { useState, useRef }          from 'react';
import { Link }                             from 'react-router-dom';
import * as UI                              from 'semantic-ui-react';

//================================================================//
// PollingList
//================================================================//
export const PollingList = observer (( props ) => {

    const {
        items,
        asyncGetInfo,
        checkIdentifier,
        makeItemMessageBody
    } = props;

    const pollingService = hooks.useFinalizable (() => new PollingService ());

    const onDelete = props.onDelete || false;
    const warning0 = props.warning0 || '';
    const warning1 = props.warning1 || '';

    const onlineIcon = props.onlineIcon || 'check circle';

    const networkList = [];
    for ( let networkName in items ) {

        const polling = pollingService.getStatus ( networkName, asyncGetInfo, checkIdentifier );

        networkList.push (
            <UI.Message
                key = { networkName }
                icon
                positive = { polling.status === POLLING_STATUS.ONLINE }
                negative = { polling.status === POLLING_STATUS.OFFLINE }
            >
                <Choose>
                    <When condition = { polling.status === POLLING_STATUS.UNKNOWN }>
                        <UI.Icon name = 'circle notched' loading/>
                    </When>

                    <When condition = { polling.status === POLLING_STATUS.ONLINE }>
                        <UI.Icon name = { onlineIcon }/>
                    </When>

                    <When condition = { polling.status === POLLING_STATUS.OFFLINE }>
                        <UI.Icon name = 'dont'/>
                    </When>
                </Choose>

                <UI.Message.Content>
                    <If condition = { onDelete }>
                        <WarnAndDeleteModal
                            trigger = {
                                <UI.Icon name = 'window close'/>
                            }
                            warning0 = { warning0 }
                            warning1 = { warning1 }
                            onDelete = {() => { onDelete ( networkName )}}
                        />
                    </If>
                    { makeItemMessageBody ( networkName, polling.info )}
                </UI.Message.Content>

            </UI.Message>
        );
    }

    return (
        <UI.List>
            { networkList }
        </UI.List>
    );
});
