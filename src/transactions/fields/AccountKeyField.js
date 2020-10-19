// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { ScannerReportMessages, SchemaScannerXLSX } from 'cardmotron';
import { assert, excel, hooks, FilePickerMenuItem, util } from 'fgc';
import JSONTree                             from 'react-json-tree';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import * as UI                              from 'semantic-ui-react';

//================================================================//
// AccountKeyField
//================================================================//
export const AccountKeyField = observer (( props ) => {

    const { field, controller } = props;

    const appState = controller.appState;
    const account = appState.account;
    const accountKeyNames = appState.getKeyNamesForTransaction ( controller.type );

    let defaultKeyName = appState.getDefaultAccountKeyName ();
    defaultKeyName = accountKeyNames.includes ( defaultKeyName ) ? defaultKeyName : accountKeyNames [ 0 ];

    const options = [];
    for ( let keyName of accountKeyNames ) {

        const key = account.keys [ keyName ];

        options.push ({
            key:        keyName,
            text:       keyName,
            value:      keyName,
        });
    }

    const onChange = ( event, data ) => {
        field.setInputString ( data.value )
        controller.validate ();
    };

    return (
        <UI.Form.Dropdown
            fluid
            search
            selection        
            options         = { options }
            defaultValue    = { defaultKeyName }
            onChange        = { onChange }
        />
    );
});
