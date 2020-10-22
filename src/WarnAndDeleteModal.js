// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AddNetworkModal }                  from './AddNetworkModal';
import { AppStateService }                  from './services/AppStateService';
import { assert, excel, hooks, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import _                                    from 'lodash';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';
import React, { useState, useRef }          from 'react';
import { Redirect }                         from 'react-router';
import { Link }                             from 'react-router-dom';
import * as UI                              from 'semantic-ui-react';

//================================================================//
// DeleteModal
//================================================================//
const DeleteModal = observer (( props ) => {

    const { trigger, header, content, action, onDelete } = props;

    return (
        <UI.Modal
            size        = 'small'
            closeIcon   = 'close'
            trigger     = { trigger }
            header      = { header }
            content     = { content }
            actions     = {[{
                key:        'action',
                content:    action,
                negative:   true
            }]}
            onActionClick = { onDelete }
        />
    );
});

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

        <Choose>
            <When condition = { warning1 }>
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
                        <DeleteModal
                            trigger     = {<UI.Button negative>{ action0 }</UI.Button>}
                            header      = { header1 }
                            content     = { warning1 }
                            action      = { action1 }
                            onDelete    = { onDelete }
                        />
                    </UI.Modal.Actions>
                </UI.Modal>
            </When>

            <Otherwise>
                <DeleteModal
                    trigger     = { trigger }
                    header      = { header0 }
                    content     = { warning0 }
                    action      = { action0 }
                    onDelete    = { onDelete }
                />
            </Otherwise>
        </Choose>
    );
});
