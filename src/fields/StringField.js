// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { observer }                         from 'mobx-react';
import React                                from 'react';
import * as UI                              from 'semantic-ui-react';

//================================================================//
// StringField
//================================================================//
export const StringField = observer (( props ) => {

    const { field } = props;

    const errorMsg          = field.error || '';
    const hasError          = ( errorMsg.length > 0 );

    const onChange = ( event ) => {
        field.setInputString ( event.target.value );
    };

    return (
         <UI.Form.Input
            fluid
            type            = 'string'
            placeholder     = { props.placeholder }
            name            = { field.fieldName }
            value           = { field.inputString }
            onChange        = { onChange }
            error           = { hasError ? errorMsg : false }
        />
    );
});
