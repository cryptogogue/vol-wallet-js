// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { Transaction, TRANSACTION_TYPE }    from './Transaction';
import { FIELD_CLASS }                      from './TransactionFormFieldControllers';
import { ScannerReportModal, SchemaScannerXLSX } from 'cardmotron';
import { assert, excel, hooks, FilePickerMenuItem, util } from 'fgc';
import JSONTree                             from 'react-json-tree';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import * as UI                              from 'semantic-ui-react';

//================================================================//
// AssetSelection
//================================================================//
const AssetSelection = observer (( props ) => {

    const { field, controller } = props;

    const selection = field.defaultValue;

    const sorted = [];
    for ( let assetID in selection ) {
        sorted.push ( selection [ assetID ]);
    }
    sorted.sort (( asset0, asset1 ) => asset0.type.localeCompare ( asset1.type ));

    const list = [];
    for ( let asset of sorted ) {

        const assetID = asset.assetID;
        const name = asset.fields.name ? asset.fields.name.value : assetID;

        list.push (
            <UI.Table.Row key = { assetID }>
                <UI.Table.Cell collapsing>
                    { assetID }
                </UI.Table.Cell>

                <UI.Table.Cell>
                    { name }
                </UI.Table.Cell>
            </UI.Table.Row>
        );
    }

    return (
        <UI.Table celled unstackable>

            <UI.Table.Header>
                <UI.Table.Row>
                    <UI.Table.HeaderCell>Asset ID</UI.Table.HeaderCell>
                    <UI.Table.HeaderCell>Name</UI.Table.HeaderCell>
                </UI.Table.Row>
            </UI.Table.Header>

            <UI.Table.Body>
                { list }
            </UI.Table.Body>
        </UI.Table>
    );
});

//================================================================//
// KeySelector
//================================================================//
const KeySelector = observer (( props ) => {

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

//================================================================//
// SchemaFileInput
//================================================================//
const SchemaFileInput = observer (( props ) => {

    const { field, controller } = props;

    const [ scanner, setScanner ]   = useState ( false );
    const [ schema, setSchema ]     = useState ( false );

    const loadFile = ( binary ) => {

        setSchema ( false );
        field.setInputString ( '' );

        const book = new excel.Workbook ( binary, { type: 'binary' });
        if ( book ) {
            const scanner = new SchemaScannerXLSX ( book );
            setSchema ( scanner.schema );
            field.setInputString ( JSON.stringify ( scanner.schema ));
            if ( scanner.hasMessages ()) {
                setScanner ( scanner );
            }
        }
        controller.validate ();
    }

    return (
        <React.Fragment>
            <UI.Menu fluid>
                <FilePickerMenuItem
                    loadFile = { loadFile }
                    format = 'binary'
                    accept = { '.xls, .xlsx' }
                />
                <ScannerReportModal scanner = { scanner }/>
            </UI.Menu>
            <If condition = { schema }>
                <JSONTree hideRoot data = { schema } theme = 'bright'/>
            </If>
        </React.Fragment>
    );
});

//================================================================//
// TransactionFormInput
//================================================================//
export const TransactionFormInput = observer (( props ) => {

    const { field, controller } = props;

    const errorMsg      = field.error || '';
    const hasError      = ( errorMsg.length > 0 );

    const onChange = ( event ) => {
        field.setInputString ( event.target.value );
        controller.validate ();
    };

    const commonProps = {
        placeholder:    field.friendlyName,
        name:           field.fieldName,
        value:          field.inputString,
        onChange:       onChange,
        error:          hasError ? errorMsg : false,
    }

    switch ( field.constructor ) {

        case FIELD_CLASS.ACCOUNT_KEY:
            return (
                 <KeySelector
                    field       = { field }
                    controller  = { controller }
                />
            );

        case FIELD_CLASS.ASSET_SELECTION:
            return (
                 <AssetSelection
                    field       = { field }
                    controller  = { controller }
                />
            );

        case FIELD_CLASS.CRYPTO_KEY:
            return (
                 <UI.Form.TextArea
                    style = {{ fontFamily: 'monospace' }}
                    rows = { field.rows || 8 }
                    { ...commonProps }
                />
            );

        case FIELD_CLASS.INTEGER:
            return (
                 <UI.Form.Input
                    fluid
                    type = 'number'
                    { ...commonProps }
                />
            );

        case FIELD_CLASS.SCHEMA:
            return (
                 <SchemaFileInput
                    field       = { field }
                    controller  = { controller }
                />
            );

        case FIELD_CLASS.STRING:
            return (
                 <UI.Form.Input
                    fluid
                    type = 'string'
                    { ...commonProps }
                />
            );

        case FIELD_CLASS.TEXT:
            return (
                 <UI.Form.TextArea
                    rows = { field.rows || 8 }
                    { ...commonProps }
                />
            );
    }

    return <div/>;
});
