// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { observer }                         from 'mobx-react';
import React                                from 'react';
import * as UI                              from 'semantic-ui-react';

//================================================================//
// TextField
//================================================================//
export const TextField = observer (( props ) => {

    const { field } = props;

    const errorMsg          = field.error || '';
    const hasError          = ( errorMsg.length > 0 );

    const onChange = ( event ) => {
        field.setInputString ( event.target.value );
    };

    return (
         <UI.Form.TextArea
            rows            = { props.rows || 8 }
            placeholder     = { props.placeholder }
            name            = { field.fieldName }
            value           = { field.inputValue }
            onChange        = { onChange }
            error           = { hasError ? errorMsg : false }
        />
    );
});
