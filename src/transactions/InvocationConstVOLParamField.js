// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { CraftingAssetSelectionModal }      from './CraftingAssetSelectionModal';
import { InvocationAssetParamRow }          from './InvocationAssetParamRow';
import * as vol                             from '../util/vol';
import CryptoJS                             from 'crypto-js';
import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import * as UI                              from 'semantic-ui-react';

//================================================================//
// InvocationConstVOLParamField
//================================================================//
export const InvocationConstVOLParamField = observer (( props ) => {

    const { controller, paramName, invocation } = props;

    const [ inputString, setInputString ]   = useState ( '' );

    const onChange = ( event ) => {
        setInputString ( event.target.value );
    };

    const onBlur = () => {

        let value = parseFloat ( inputString );
        if ( isNaN ( value )) {
            setInputString ( '' );
        }
        else {
            value = Math.floor ( value * 1000 );
            controller.setConstParam ( invocation, paramName, value );
            setInputString ( vol.format ( value ));
        }
    };

    const onKeyPress = ( event ) => {
        if ( event.key === 'Enter' ) {
            event.target.blur ();
        }
    }

    return (
        <UI.Form.Input
            fluid
            key             = { paramName }
            label           = { paramName }
            placeholder     = 'VOL'
            type            = 'number'
            step            = '0.001'
            name            = { paramName }
            value           = { inputString }
            onChange        = { onChange }
            onKeyPress      = { onKeyPress }
            onBlur          = { onBlur }
            error           = { props.error }
        />
    );
});
