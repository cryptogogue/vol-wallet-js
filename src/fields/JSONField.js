// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import * as UI                              from 'semantic-ui-react';

//================================================================//
// JSONField
//================================================================//
export const JSONField = observer (( props ) => {

    const { field } = props;

    return (
        <React.Fragment>
            <UI.Segment attached = 'bottom'>
                 <UI.Form.TextArea
                    attached        = 'bottom'
                    style           = {{ fontFamily: 'monospace' }}
                    rows            = { field.rows || 8 }
                    placeholder     = { props.placeholder || 'JSON Text' }
                    name            = { field.fieldName }
                    value           = { field.jsonText }
                    onChange        = {( event ) => { field.setJSONText ( event.target.value ); }}
                    onBlur          = {() => { field.validate (); }}
                    error           = { field.error || false }
                />
            </UI.Segment>
        </React.Fragment>
    );
});
