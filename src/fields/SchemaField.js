// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { ScannerReportMessages, SchemaScannerXLSX } from 'cardmotron';
import { excel, FilePickerMenuItem }        from 'fgc';
import JSONTree                             from 'react-json-tree';
import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import * as UI                              from 'semantic-ui-react';

//================================================================//
// SchemaField
//================================================================//
export const SchemaField = observer (( props ) => {

    const { field }                     = props;
    const [ errors, setErrors ]         = useState ([]);
    const [ warnings, setWarnings ]     = useState ([]);
    const [ isLoading, setIsLoading ]   = useState ( false );

    const formController    = field.formController;
    const networkService    = field.networkService;

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

    const filterDefinitionCollisions = ( tableName, scanner, current, update ) => {

        for ( let key in current ) {
            if ( _.has ( update, key )) {

                const fields0 = current [ key ].fields;
                const fields1 = update [ key ].fields;

                if ( !_.isEqual ( fields0, fields1 )) {

                    for ( let fieldname in fields0 ) {
                        if ( !_.has ( fields1, fieldname )) {
                            scanner.reportError ( `Collision in definition '${ key }': Attemped redefinition removing field named '${ fieldname }'.` );
                        }
                    }

                    for ( let fieldname in fields1 ) {
                        if ( !_.has ( fields0, fieldname )) {
                            scanner.reportError ( `Collision in definition '${ key }': Attemped redefinition adding field named '${ fieldname }'.` );
                        }
                    }

                    for ( let fieldname in fields0 ) {
                        if ( _.has ( fields1, fieldname ) && !_.isEqual ( fields0 [ fieldname ], fields1 [ fieldname ])) {
                            scanner.reportError ( `Collision in definition '${ key }': Mismatch on field '${ fieldname }'.` );
                        }
                    }
                }
                delete update [ key ];
            }
        }
    }

    const loadFile = async ( binary ) => {

        setIsLoading ( true );
        field.setSchema ();
        let errorMessages = [];
        let warningMessages = [];

        const book = new excel.Workbook ( binary, { type: 'binary' });
        if ( book ) {

            let scanner = false;
            try {
                scanner = new SchemaScannerXLSX ( book );
            }
            catch ( error ) {
                console.log ( error );
                errorMessages.push ({ header: 'Scanner Error', body: error });
            }
            
            if ( scanner && formController.checkSchema ) {

                let current = false;

                try {
                    current = await networkService.revocable.fetchJSON ( networkService.getServiceURL ( '/schema' ));
                    if ( !( current && current.schema )) throw 'Could not download current schema.'
                }
                catch ( error ) {
                    errorMessages.push ({ header: 'Network Error', body: 'Could not fetch current schema. Node may be offline.' });
                }

                if ( scanner && current ) {

                    const version0 = current.schema.version;
                    const version1 = scanner.schema.version;

                    if ( !( version0.release || version1.release )) {
                        errorMessages.push ({ header: 'Version Error', body: 'Missing version release name.' });
                    }

                    if ( !(
                        ( !version0.release ) ||
                        ( version0.major <= version1.major ) &&
                        ( version0.minor <= version1.minor ) &&
                        ( version0.revision < version1.revision )
                    )) {
                        errorMessages.push ({ header: 'Version Error', body: 'New schema must increment version.' });
                    }

                    filterDefinitionCollisions ( 'definitions', scanner, current.schema.definitions, scanner.schema.definitions );

                    filterCollisions ( 'fonts', scanner, current.schema.fonts, scanner.schema.fonts );
                    filterCollisions ( 'icons', scanner, current.schema.icons, scanner.schema.icons );
                    filterCollisions ( 'layouts', scanner, current.schema.layouts, scanner.schema.layouts );
                    filterCollisions ( 'upgrades', scanner, current.schema.upgrades, scanner.schema.upgrades );
                    filterCollisions ( 'methods', scanner, current.schema.methods, scanner.schema.methods );
                    filterCollisions ( 'rewards', scanner, current.schema.rewards, scanner.schema.rewards );
                    filterCollisions ( 'sets', scanner, current.schema.sets, scanner.schema.sets );

                    if ( _.isEqual ( current.schema.decks, scanner.schema.decks )) {
                        scanner.schema.decks = {};
                    }
                }

                errorMessages       = errorMessages.concat ( scanner.errors );
                warningMessages     = warningMessages.concat ( scanner.warnings );
            }

            if ( scanner ) {
                field.setSchema ( scanner.schema );
            }
        }

        if ( field.error ) {
            errorMessages.push ({ header: 'Field Error', body: field.error });
        }

        setIsLoading ( false );
        setErrors ( errorMessages );
        setWarnings ( warningMessages );
    }

    let deckOptions = [];
    if ( field.schema && formController.isPublishAndReset ) {

        const sortedDecksAndSets = [];

        for ( let deckName in field.schema.decks ) {
            sortedDecksAndSets.push ( deckName );
        }

        for ( let setName in field.schema.sets ) {
            sortedDecksAndSets.push ( setName );
        }

        sortedDecksAndSets.sort (( a, b ) => a.localeCompare ( b ));

        for ( let name of sortedDecksAndSets ) {

            deckOptions.push (
                <UI.Dropdown.Item
                    key         = { name }
                    text        = { name }
                    onClick     = {() => { formController.setDeckName ( name )}}
                />
            );
        }
    }

    const messages = [];
    let count = 0;

    for ( let message of errors ) {
        messages.push (
            <UI.Message visible icon negative key = { count++ }>
                <UI.Icon name = 'bug' />
                <UI.Message.Content>
                    <UI.Message.Header>{ message.header }</UI.Message.Header>
                    { message.body }
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

            <ScannerReportMessages
                errors      = { errors }
                warnings    = { warnings }
            />

            <If condition = {( errors.length === 0 )}>

                <If condition = { field.schema }>
                    <JSONTree hideRoot data = { field.schema } theme = 'bright'/>
                </If>

                <If condition = { deckOptions.length > 0 }>
                    <UI.Menu>
                        <UI.Dropdown
                            fluid
                            item
                            closeOnBlur
                            placeholder     = 'Get Deck'
                            text            = { formController.deckName }
                        >
                            <UI.Dropdown.Menu>
                                { deckOptions }
                            </UI.Dropdown.Menu>
                        </UI.Dropdown>
                    </UI.Menu>
                </If>
            </If>

        </React.Fragment>
    );
});
