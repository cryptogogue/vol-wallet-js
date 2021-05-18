// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { DateTime, Duration }               from 'luxon';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import { DateInput, TimeInput }             from 'semantic-ui-calendar-react';
import * as UI                              from 'semantic-ui-react';

//================================================================//
// DateTimeInputField
//================================================================//
export const DateTimeInputField = observer (( props ) => {

    const { date, setDate }         = props;

    const updateDate = ( value ) => {
        const newDate = DateTime.fromISO ( value ); 
        setDate ( DateTime.local ( newDate.year, newDate.month, newDate.day, date.hour, date.minute ));
    }

    const updateTime = ( value ) => {
        const duration = Duration.fromISOTime ( value );
        setDate ( DateTime.local ( date.year, date.month, date.day, duration.hours, duration.minutes ));
    }

    const dateStr = date.toISODate ();
    const timeStr = date.toFormat ( 'HH:mm' );

    return (
        <UI.Form.Group widths='equal'>

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
                        minDate         = { props.minDate.toISODate ()}
                        value           = { dateStr }
                        onChange        = {( event, { value }) => { updateDate ( value )}}
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
                        onChange        = {( event, { value }) => { updateTime ( value )}}
                    />
                }
            />

        </UI.Form.Group>
    );
});
