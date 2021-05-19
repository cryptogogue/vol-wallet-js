// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { ScannerReportMessages, SchemaScannerXLSX } from 'cardmotron';
import { assert, crypto, excel, hooks, FilePickerMenuItem, util } from 'fgc';
import JSONTree                             from 'react-json-tree';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import { DateInput, TimeInput }             from 'semantic-ui-calendar-react';
import * as UI                              from 'semantic-ui-react';

//================================================================//
// DateTimeField
//================================================================//
export const DateTimeField = observer (( props ) => {

    const { field } = props;

    const errorMsg      = field.error || '';
    const hasError      = ( errorMsg.length > 0 );

    const dateStr = field.dateTime.toISODate ();
    const timeStr = field.dateTime.toFormat ( 'HH:mm' );

    return (
        <UI.Form.Group widths = 'equal'>

            <UI.Popup
                trigger = {
                    <UI.Form.Input
                        fluid
                        icon            = 'calendar alternate'
                        iconPosition    = 'left'
                        type            = 'string'
                        placeholder     = 'Expiration Date'
                        value           = { dateStr }
                    />
                }
                on = 'click'
                position = 'top left'
                content = {
                    <DateInput
                        inline
                        name            = 'date'
                        dateFormat      = 'YYYY-MM-DD'
                        minDate         = { field.minDateTime ? field.minDateTime.toISODate () : undefined }
                        value           = { dateStr }
                        onChange        = {( event, { value }) => { field.setDate ( value )}}
                    />
                }
            />

            <UI.Popup
                trigger = {
                    <UI.Form.Input
                        fluid
                        icon            = 'clock'
                        iconPosition    = 'left'
                        type            = 'string'
                        placeholder     = 'Expiration Time'
                        value           = { timeStr }
                        error           = { hasError ? errorMsg : false }
                    />
                }
                on = 'click'
                position = 'top left'
                content = {
                    <TimeInput
                        inline
                        disableMinute
                        name            = 'time'
                        value           = { timeStr }
                        onChange        = {( event, { value }) => { field.setTime ( value )}}
                    />
                }
            />

        </UI.Form.Group>
    );
});
