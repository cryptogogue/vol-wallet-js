// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { ScannerReportMessages, SchemaScannerXLSX } from 'cardmotron';
import { assert, excel, hooks, FilePickerMenuItem, util } from 'fgc';
import JSONTree                             from 'react-json-tree';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
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
