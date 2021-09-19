// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { NavigationBar }                                    from './NavigationBar';
import { AppStateService }                                  from './services/AppStateService';
import { ScannerReportModal, scanXLSXSchemaAsync }          from 'cardmotron';
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
    const [ loading, setLoading ]   = useState ( false );

    const loadFile = async ( binary ) => {

        setSchema ( false );
        setLoading ( true );

        const book = new excel.Workbook ( binary, { type: 'binary' });
        if ( book ) {
            const scanner = await scanXLSXSchemaAsync ( book );
            setSchema ( scanner.schema );
            if ( scanner.hasMessages ()) {
                setScanner ( scanner );
            }
        }
        setLoading ( false );
    }

    const onReportClose = () => {
        setScanner ( false );
        setSchema ( false );
    }

    return (
        <SingleColumnContainerView>

            <NavigationBar appState = { appState }/>

            <UI.Menu borderless attached = 'bottom'>
                <FilePickerMenuItem
                    loadFile    = { loadFile }
                    loading     = { loading }
                    format      = 'binary'
                    accept      = { '.xls, .xlsx' }
                />
                <UI.Menu.Menu position = "right">
                    <ClipboardMenuItem
                        value   = { schema ? JSON.stringify ( schema, null, 4 ) : false }
                    />
                </UI.Menu.Menu>
            </UI.Menu>

            <If condition       = { schema }>
                <JSONTree hideRoot data = { schema } theme = 'bright'/>
            </If>

            <ScannerReportModal
                scanner         = { scanner }
                onClose         = { onReportClose }
            />

        </SingleColumnContainerView>
    );
});
