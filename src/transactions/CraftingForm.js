// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { CraftingMethodDropdown }           from './CraftingMethodDropdown';
import { InvocationField }                  from './InvocationField';
import * as vol                             from '../util/vol';
import CryptoJS                             from 'crypto-js';
import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import * as UI                              from 'semantic-ui-react';

//================================================================//
// CraftingForm
//================================================================//
export const CraftingForm = observer (( props ) => {

    const { controller } = props;

    const addInvocation = ( methodName ) => {
        controller.addInvocation ( methodName );
    }

    const invocationFields = [];
    for ( let i in controller.invocations ) {
        invocationFields.push (
            <InvocationField
                key         = { i }
                controller  = { controller }
                invocation  = { controller.invocations  [ i ]}
                index       = { i }
            />
        );
    }

    const showDropdown = controller.singleInvocation !== true;

    return (
        <React.Fragment>
            <UI.Segment>

                { invocationFields }

                <If condition = { controller.hasErrors }>
                    <UI.Message icon negative>
                        <UI.Icon name = 'warning circle'/>
                        <UI.Message.Content>
                            <UI.Message.Header>Error</UI.Message.Header>
                            <p>One or more invocations has param or constraint errors.</p>
                        </UI.Message.Content>
                    </UI.Message>
                </If>

                <If condition = { showDropdown }>
                    <CraftingMethodDropdown
                        key             = { controller.invocations.length }
                        controller      = { controller }
                        addInvocation   = { addInvocation }
                    />
                </If>

            </UI.Segment>
        </React.Fragment>
    );
});
