// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { CraftingAssetSelectionModal }      from './CraftingAssetSelectionModal';
import { InvocationAssetParamRow }          from './InvocationAssetParamRow';
import * as vol                             from '../util/vol';
import CryptoJS                             from 'crypto-js';
import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import * as UI                              from 'semantic-ui-react';

//================================================================//
// InvocationConstNumericParamField
//================================================================//
export const InvocationConstNumericParamField = observer (( props ) => {

    const { controller, paramName, invocation } = props;

    const setValue = ( value ) => {
        
        value = props.isInt  ? parseInt ( value ) : parseFloat ( value );

        if ( !isNaN ( value )) {
            controller.setConstParam ( invocation, paramName, value );
        }
    }

    const value = invocation.constParams [ paramName ].value || 0;

    return (
        <UI.Form.Input
            fluid
            key             = { paramName }
            label           = { paramName }
            placeholder     = 'Numeric Param'
            type            = 'number'
            name            = { paramName }
            value           = { value }
            onChange        = {( event ) => { setValue ( event.target.value )}}
            error           = { props.error }
        />
    );
});
