// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AddNetworkModal }                  from './AddNetworkModal';
import { AppStateService }                  from './AppStateService';
import { assert, excel, hooks, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import _                                    from 'lodash';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';
import React, { useState, useRef }          from 'react';
import { Redirect }                         from 'react-router';
import { Link }                             from 'react-router-dom';
import * as UI                              from 'semantic-ui-react';

//================================================================//
// WarnAndDeleteModal
//================================================================//
export const WarnAndDeleteModal = observer (( props ) => {

    const { trigger, onDelete, warning0, warning1 } = props;

    const header0 = props.header0 || 'Warning';
    const action0 = props.action0 || 'Delete';

    const header1 = props.header1 || 'Are you really sure?';
    const action1 = props.action1 || 'I understand. Do it already!';

    return (
        <UI.Modal
            closeIcon = 'close'
            trigger = { trigger }
        >
            <UI.Modal.Header>{ header0 }</UI.Modal.Header>

            <UI.Modal.Content>
                <UI.Modal.Description>
                    { warning0 }
                </UI.Modal.Description>
            </UI.Modal.Content>

            <UI.Modal.Actions>
                <UI.Modal
                    size        = 'small'
                    closeIcon   = 'close'
                    trigger     = {
                        <UI.Button negative>{ action0 }</UI.Button>
                    }
                    header      = { header1 }
                    content     = { warning1 }
                    actions     = {[{
                        key:        'action',
                        content:    action1,
                        negative:   true
                    }]}
                    onActionClick = { onDelete }
                />
            </UI.Modal.Actions>
        </UI.Modal>
    );
});
