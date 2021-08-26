// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { observer }                         from 'mobx-react';
import React                                from 'react';
import * as UI                              from 'semantic-ui-react';

//================================================================//
// IntegerField
//================================================================//
export const IntegerField = observer (( props ) => {

    const { field } = props;

    const errorMsg      = field.error || '';
    const hasError      = ( errorMsg.length > 0 );

    const onChange = ( event ) => {
        field.setInputString ( event.target.value );
    };

    return (
         <UI.Form.Input
            fluid
            type            = 'number'
            placeholder     = { props.placeholder }
            name            = { field.fieldName }
            value           = { field.inputString }
            onChange        = { onChange }
            error           = { hasError ? errorMsg : false }
        />
    );
});
