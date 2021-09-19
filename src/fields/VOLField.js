// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import * as UI                              from 'semantic-ui-react';

//================================================================//
// VOLField
//================================================================//
export const VOLField = observer (( props ) => {

    const { field } = props;
    const [ inputString, setInputString ] = useState ( field.inputString );

    const errorMsg      = field.error || '';
    const hasError      = ( errorMsg.length > 0 );

    const onChange = ( event ) => {
        setInputString ( event.target.value );
    };

    const onBlur = () => {
        field.setInputString ( inputString );
        setInputString ( field.inputString );
    };

    const onKeyPress = ( event ) => {
        if ( event.key === 'Enter' ) {
            event.target.blur ();
        }
    }

    return (
         <UI.Form.Input
            fluid
            type            = 'number'
            step            = '0.001'
            placeholder     = { props.placeholder }
            name            = { field.fieldName }
            value           = { inputString }
            onChange        = { onChange }
            onKeyPress      = { onKeyPress }
            onBlur          = { onBlur }
            error           = { hasError ? errorMsg : false }
        />
    );
});
