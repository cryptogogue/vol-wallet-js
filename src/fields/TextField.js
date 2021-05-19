// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { ScannerReportMessages, SchemaScannerXLSX } from 'cardmotron';
import { assert, excel, hooks, FilePickerMenuItem, util } from 'fgc';
import JSONTree                             from 'react-json-tree';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import * as UI                              from 'semantic-ui-react';

//================================================================//
// TextField
//================================================================//
export const TextField = observer (( props ) => {

    const { field } = props;

    const errorMsg          = field.error || '';
    const hasError          = ( errorMsg.length > 0 );

    const onChange = ( event ) => {
        field.inputValue = event.target.value;
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
