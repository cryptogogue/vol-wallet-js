// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as vol                             from '../../util/vol';
import { ScannerReportMessages, SchemaScannerXLSX } from 'cardmotron';
import { assert, excel, hooks, FilePickerMenuItem, util } from 'fgc';
import JSONTree                             from 'react-json-tree';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import * as UI                              from 'semantic-ui-react';

//================================================================//
// VOLField
//================================================================//
export const VOLField = observer (( props ) => {

    const { field, controller } = props;

    const errorMsg      = field.error || '';
    const hasError      = ( errorMsg.length > 0 );

    const onChange = ( event ) => {
        field.setInputString ( event.target.value );
        controller.validate ();
    };

    const onBlur = () => {
        const value = event.target.value ? vol.format ( Number ( event.target.value ) * 1000 ) : '';
        field.setInputString ( value );
        controller.validate ();
    };

    return (
         <UI.Form.Input
            fluid
            type            = 'number'
            step            = '0.001'
            placeholder     = { field.friendlyName }
            name            = { field.fieldName }
            value           = { field.inputString }
            onChange        = { onChange }
            onBlur          = { onBlur }
            error           = { hasError ? errorMsg : false }
        />
    );
});
