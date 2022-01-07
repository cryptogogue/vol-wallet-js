// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { FieldController }                  from './FieldController'
import { DateTime, Duration }               from 'luxon';
import { action, extendObservable }         from 'mobx';

//================================================================//
// DateTimeFieldController
//================================================================//
export class DateTimeFieldController extends FieldController {

    //----------------------------------------------------------------//
    constructor ( fieldName, initialValue, minDateTime ) {
        super ( fieldName );

        extendObservable ( this, {
            dateTime:   initialValue || DateTime.now (),
        });

        this.minDateTime = minDateTime;
    }

    //----------------------------------------------------------------//
    @action
    setDate ( value ) {
        
        const newDate = DateTime.fromISO ( value );
        if ( newDate.invalid ) throw new Error ( 'Invalid date format.' );

        this.dateTime = DateTime.local ( newDate.year, newDate.month, newDate.day, this.dateTime.hour, this.dateTime.minute );
        this.update ();
    }

    //----------------------------------------------------------------//
    @action
    setTime ( value ) {

        const duration = Duration.fromISOTime ( value );
        if ( duration.invalid ) throw new Error ( 'Invalid time format.' );

        this.dateTime = DateTime.local ( this.dateTime.year, this.dateTime.month, this.dateTime.day, duration.hours, duration.minutes );
        this.update ();
    }

    //----------------------------------------------------------------//
    virtual_toTransactionFieldValue () {
        return this.dateTime.toUTC ().toISO ();
    }

    //----------------------------------------------------------------//
    @action
    virtual_validate () {

        // NOTE: time can be earlier than minDateTime only because of the way the time picker works; date cannot be earlier
        if ( this.minDateTime && ( this.dateTime < this.minDateTime )) {
            this.error = `Cannot be earlier than ${ this.minDateTime.toLocaleString ( DateTime.DATETIME_MED )}`;
        }
    }
}
