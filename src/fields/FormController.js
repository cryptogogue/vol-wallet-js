// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { assert, excel, hooks, randomBytes, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import _                                    from 'lodash';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';

const SPECIAL_FIELDS = [
    'gratuity',
    'makerKeyName',
];

// TODO: this should be the base class for transaqction and control form controllers 

//================================================================//
// FormController
//================================================================//
export class FormController {

    //----------------------------------------------------------------//
    constructor () {
    }

    //----------------------------------------------------------------//
    finalize () {
    }

    //----------------------------------------------------------------//
    initialize ( appState, fieldsArray ) {

        this.appState               = appState;

        fieldsArray = fieldsArray || [];

        const fields = {};
        for ( let field of fieldsArray ) {
            field.formController        = this;
            fields [ field.fieldName ]  = field;
        }

        extendObservable ( this, {
            fields:             fields,
            fieldsArray:        fieldsArray,
            isComplete:         false,
            isErrorFree:        false,
        });

        this.validate ();
    }

    //----------------------------------------------------------------//
    @computed
    get isCompleteAndErrorFree () {

        return this.isComplete && this.isErrorFree;
    }

    //----------------------------------------------------------------//
    @action
    validate () {

        // check for completion
        this.isComplete = this.virtual_checkComplete ();
        for ( let field of this.fieldsArray ) {
            if ( !field.isComplete ) {
                this.isComplete = false;
                break;
            }
        }

        // reset errors
        for ( let field of this.fieldsArray ) {
            field.error = false;
            field.validate ();
        }

        // check error free
        this.isErrorFree = true;
        this.virtual_validate ();
        for ( let field of this.fieldsArray ) {
            if ( field.error ) {
                this.isErrorFree = false;
                break;
            }
        }

        if ( this.isCompleteAndErrorFree ) {
            this.virtual_compute ();
        }
    }

    //----------------------------------------------------------------//
    virtual_checkComplete () {

        return true;
    }

    //----------------------------------------------------------------//
    virtual_compute () {
    }

    //----------------------------------------------------------------//
    virtual_validate () {
    }
}
