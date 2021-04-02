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

    const { field } = props;

    const formController    = field.formController;
    const accountService    = field.accountService;
    const account           = accountService.account;
    const accountKeyNames   = accountService.getKeyNamesForTransaction ( formController.type );

    let defaultKeyName = accountService.getDefaultAccountKeyName ();
    defaultKeyName = accountKeyNames.includes ( defaultKeyName ) ? defaultKeyName : accountKeyNames [ 0 ];

    const options = [];
    for ( let keyName of accountKeyNames ) {

        options.push ({
            key:        keyName,
            text:       keyName,
            value:      keyName,
        });
    }

    const onChange = ( event, data ) => {
        field.setInputString ( data.value )
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
