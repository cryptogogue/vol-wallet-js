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

    const { field, controller }         = props;
    const [ errors, setErrors ]         = useState ([]);
    const [ schema, setSchema ]         = useState ( false );
    const [ isLoading, setIsLoading ]   = useState ( false );

    const filterCollisions = ( tableName, scanner, current, update ) => {

        for ( let key in update ) {
            if ( _.has ( current, key )) {
                if ( !_.isEqual ( current [ key ], update [ key ])) {
                    console.log ( 'HAS COLLISION!', key );
                    console.log ( 'CURRENT:', JSON.stringify ( current [ key ]));
                    console.log ( 'UPDATE:', JSON.stringify ( update [ key ]));
                    scanner.reportError ( `Collision in ${ tableName }: ${ key }` );
                }
                delete update [ key ];
            }
        }
    }

    const loadFile = async ( binary ) => {

        setSchema ( false );
        setIsLoading ( true );
        field.setInputString ( '' );
        let errorMessages = [];

        const book = new excel.Workbook ( binary, { type: 'binary' });
        if ( book ) {

            const appState      = controller.appState;
            const nodeURL       = appState.network.nodeURL;

            try {

                const current = await appState.revocable.fetchJSON ( nodeURL + '/schema' );
                const scanner = new SchemaScannerXLSX ( book );
                if ( !( scanner && scanner.schema )) throw 'Could not download current schema.'

                filterCollisions ( 'definitions', scanner, current.schema.definitions, scanner.schema.definitions );
                filterCollisions ( 'fonts', scanner, current.schema.fonts, scanner.schema.fonts );
                filterCollisions ( 'icons', scanner, current.schema.icons, scanner.schema.icons );
                filterCollisions ( 'layouts', scanner, current.schema.layouts, scanner.schema.layouts );
                filterCollisions ( 'upgrades', scanner, current.schema.upgrades, scanner.schema.upgrades );
                filterCollisions ( 'methods', scanner, current.schema.methods, scanner.schema.methods );
                filterCollisions ( 'sets', scanner, current.schema.sets, scanner.schema.sets );

                if ( _.isEqual ( current.schema.decks, scanner.schema.decks )) {
                    scanner.schema.decks = {};
                }

                if ( scanner.hasErrors ()) {
                    errorMessages = errorMessages.concat ( scanner.errors );
                }
                setSchema ( scanner.schema );
                field.setInputString ( JSON.stringify ( scanner.schema ));
            }
            catch ( error ) {
                errorMessages.push ({ header: 'Network Error', body: 'Could not fetch current schema. Node may be offline.' });
            }
        }
        controller.validate ();
        if ( field.error ) {
            errorMessages.push ({ header: 'Field Error', body: field.error });
        }
        setIsLoading ( false );
        setErrors ( errorMessages );
    }

    const errorMessages = []
    for ( let error of errors ) {
        errorMessages.push (
            <UI.Message icon negative key = { errorMessages.length }>
                <UI.Icon name = 'bug' />
                <UI.Message.Content>
                    <UI.Message.Header>{ error.header }</UI.Message.Header>
                    { error.body }
                </UI.Message.Content>
            </UI.Message>
        );
    }

    return (
        <React.Fragment>

            <UI.Menu fluid>
                <FilePickerMenuItem
                    loadFile = { loadFile }
                    format = 'binary'
                    accept = { '.xls, .xlsx' }
                    loading = { isLoading }
                />
            </UI.Menu>

            <Choose>
                <When condition = { errorMessages.length > 0 }>
                    { errorMessages }
                </When>

                <Otherwise>
                    <If condition = { schema }>
                        <JSONTree hideRoot data = { schema } theme = 'bright'/>
                    </If>
                </Otherwise>
            </Choose>

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
