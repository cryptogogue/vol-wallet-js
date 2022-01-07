// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { DateTime, Duration }               from 'luxon';
import { observer }                         from 'mobx-react';
import React                                from 'react';
import { DateInput, TimeInput }             from 'semantic-ui-calendar-react';
import * as UI                              from 'semantic-ui-react';

//================================================================//
// DateTimeField
//================================================================//
export const DateTimeField = observer (( props ) => {

    const { field }                             = props;

    const dateInputRef                          = React.useRef ();
    const timeInputRef                          = React.useRef ();
    const [ showDatePopup, setShowDatePopup ]   = React.useState ( false );
    const [ showTimePopup, setShowTimePopup ]   = React.useState ( false );

    const [ dateStr, setDateStr ]               = React.useState ( field.dateTime.toISODate ());
    const [ dateError, setDateError ]           = React.useState ( false );

    const [ timeStr, setTimeStr ]               = React.useState ( field.dateTime.toFormat ( 'HH:mm' ));
    const [ timeError, setTimeError ]           = React.useState ( false );

    const errorMsg      = field.error || '';
    const hasError      = ( errorMsg.length > 0 );

    //const dateStr       = field.dateTime.toISODate ();
    //const timeStr       = field.dateTime.toFormat ( 'HH:mm' );

    const updateDateValue = ( value ) => {
        try {
            field.setDate ( value );
            setDateStr ( field.dateTime.toISODate ());
        }
        catch ( error ) {
            setDateError ( 'Invalid date format. Please enter YYYY-MM-DD.' );
        }
    }

    const updateTimeValue = ( value ) => {
        try {
            field.setTime ( value );
            setTimeStr ( field.dateTime.toFormat ( 'HH:mm' ));
        }
        catch ( error ) {
            setTimeError ( 'Invalid time format. Please enter HH:mm.' );
        }
    }

    const onBlur = ( event ) => {
        updateDateValue ( dateStr );
        updateTimeValue ( timeStr );
    }

    const onKeyPress = ( event ) => {
        if ( event.key === 'Enter' ) {
            event.preventDefault ();
            event.stopPropagation ();
            event.target.blur ();
        }
    }

    return (
        <UI.Form.Group widths = 'equal'>

            <UI.Form.Input
                action = {{
                    icon: 'calendar alternate',
                    onClick: ( event ) => {
                        dateInputRef.current = event.target;
                        setShowDatePopup ( true );
                    },
                }}
                fluid
                actionPosition  = 'left'
                type            = 'string'
                placeholder     = 'Expiration Date'
                value           = { dateStr }
                onChange        = {( event ) => {
                    setDateError ( false );
                    setDateStr ( event.target.value );
                }}
                onKeyPress      = { onKeyPress }
                onBlur          = { onBlur }
                error           = { dateError }
            />

            <UI.Form.Input
                action = {{
                    icon: 'clock',
                    onClick: ( event ) => {
                        timeInputRef.current = event.target;
                        setShowTimePopup ( true );
                    },
                }}
                fluid
                actionPosition  = 'left'
                type            = 'string'
                placeholder     = 'Expiration Time'
                value           = { timeStr }
                onChange        = {( event ) => {
                    setTimeError ( false );
                    setTimeStr ( event.target.value );
                }}
                onKeyPress      = { onKeyPress }
                onBlur          = { onBlur }
                error           = { timeError || ( hasError ? errorMsg : false )}
            />

            <If condition = { showDatePopup }>
                <UI.Popup
                    open
                    context         = { dateInputRef }
                    position        = 'top left'
                    onClose         = {() => { setShowDatePopup ( false ); }}
                    content = {
                        <DateInput
                            inline
                            name            = 'date'
                            dateFormat      = 'YYYY-MM-DD'
                            minDate         = { field.minDateTime ? field.minDateTime.toISODate () : undefined }
                            value           = { dateStr }
                            onChange        = {( event, { value }) => { updateDateValue ( value )}}
                        />
                    }
                />
            </If>

            <If condition = { showTimePopup }>
                <UI.Popup
                    open
                    context         = { timeInputRef }
                    position        = 'top left'
                    onClose         = {() => { setShowTimePopup ( false ); }}
                    content = {
                        <TimeInput
                            inline
                            disableMinute
                            name            = 'time'
                            value           = { timeStr }
                            onChange        = {( event, { value }) => { updateTimeValue ( value )}}
                        />
                    }
                />
            </If>

        </UI.Form.Group>
    );
});
