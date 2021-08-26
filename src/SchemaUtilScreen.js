// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { NavigationBar }                                    from './NavigationBar';
import { AppStateService }                                  from './services/AppStateService';
import { ScannerReportModal, SchemaScannerXLSX }            from 'cardmotron';
import _                                                    from 'lodash';
import { ClipboardMenuItem, excel, FilePickerMenuItem, SingleColumnContainerView } from 'fgc';
import { observer }                                         from 'mobx-react';
import React, { useState }                                  from 'react';
import JSONTree                                             from 'react-json-tree';
import * as UI                                              from 'semantic-ui-react';

const appState = AppStateService.get ();

//================================================================//
// SchemaUtilScreen
//================================================================//
export const SchemaUtilScreen = observer (( props ) => {

    const [ scanner, setScanner ]   = useState ( false );
    const [ schema, setSchema ]     = useState ( false );

    const loadFile = ( binary ) => {

        setSchema ( false );

        const book = new excel.Workbook ( binary, { type: 'binary' });
        if ( book ) {
            const scanner = new SchemaScannerXLSX ( book );
            setSchema ( scanner.schema );
            if ( scanner.hasMessages ()) {
                setScanner ( scanner );
            }
        }
    }

    return (
        <SingleColumnContainerView>

            <NavigationBar appState = { appState }/>

            <UI.Menu borderless attached = 'bottom'>
                <FilePickerMenuItem
                    loadFile = { loadFile }
                    format = 'binary'
                    accept = { '.xls, .xlsx' }
                />
                <UI.Menu.Menu position = "right">
                    <ClipboardMenuItem
                        value = { schema ? JSON.stringify ( schema, null, 4 ) : false }
                    />
                </UI.Menu.Menu>
            </UI.Menu>

            <If condition = { schema }>
                <JSONTree hideRoot data = { schema } theme = 'bright'/>
            </If>

            <ScannerReportModal
                scanner = { scanner }
                setScanner = { setSchema }
            />

        </SingleColumnContainerView>
    );
});
