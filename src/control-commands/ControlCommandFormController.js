// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { COMMAND_TYPE }                      from './ControlCommand';
import { assert, crypto, randomBytes, RevocableContext, StorageContext, util } from 'fgc';
import _                                    from 'lodash';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';

// TODO: factor common functionality out into the fields module 

//================================================================//
// ControlCommandFormController
//================================================================//
export class ControlCommandFormController {

    //----------------------------------------------------------------//
    constructor () {
    }

    //----------------------------------------------------------------//
    finalize () {
    }

    //----------------------------------------------------------------//
    @computed get
    friendlyName () {

        return COMMAND_TYPE.friendlyNameForType ( this.type );
    }

    //----------------------------------------------------------------//
    initialize ( appState, type, fieldsArray ) {

        this.appState               = appState;
        this.type                   = type;
        this.makerAccountName       = appState.accountID;

        fieldsArray = fieldsArray || [];

        const fields = {};
        for ( let field of fieldsArray ) {
            field.controller            = this;
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
    async makeSignedEnvelope ( password ) {

        this.appState.assertPassword ( password );

        let body = {
            type: this.type,
        };
        for ( let field of this.fieldsArray ) {
            body [ field.fieldName ] = field.value;
        }
        
        let envelope = {
            body: JSON.stringify ( body ),
        };

        const key               = this.appState.network.controlKey;
        const privateKeyHex     = crypto.aesCipherToPlain ( key.privateKeyHexAES, password );
        const privateKey        = await crypto.keyFromPrivateHex ( privateKeyHex );

        envelope.signature = {
            hashAlgorithm:  'SHA256',
            digest:         privateKey.hash ( envelope.body ),
            signature:      privateKey.sign ( envelope.body ),
        };

        return envelope;
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
    }

    //----------------------------------------------------------------//
    virtual_checkComplete () {

        return true;
    }

    //----------------------------------------------------------------//
    virtual_validate () {
    }
}
