// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { CraftingAssetSelectionModal }      from './CraftingAssetSelectionModal';
import { InvocationAssetParamRow }          from './InvocationAssetParamRow';
import * as vol                             from '../util/vol';
import CryptoJS                             from 'crypto-js';
import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import * as UI                              from 'semantic-ui-react';

//================================================================//
// InvocationConstTextParamField
//================================================================//
export const InvocationConstTextParamField = observer (( props ) => {

    const { controller, paramName, invocation } = props;

    const value = invocation.constParams [ paramName ].value || '';

    const setValue = ( value ) => {
        controller.setConstParam ( invocation, paramName, value );
    }

    return (
        <UI.Form.TextArea
            rows            = '6'
            key             = { paramName }
            label           = { paramName }
            placeholder     = 'Text Param'
            name            = { paramName }
            value           = { value }
            onChange        = {( event ) => { setValue ( event.target.value )}}
            error           = { props.error }
        />
    );
});
