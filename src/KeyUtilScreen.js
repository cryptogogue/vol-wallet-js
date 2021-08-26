// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                                          from './fields/fields'
import { NavigationBar }                                    from './NavigationBar';
import _                                                    from 'lodash';
import { ClipboardMenuItem, hooks, SingleColumnContainerView } from 'fgc';
import { observer }                                         from 'mobx-react';
import React, { useState }                                  from 'react';
import * as UI                                              from 'semantic-ui-react';

//================================================================//
// TransactionUtilController
//================================================================//
export class TransactionUtilController extends Fields.FormController {

    //----------------------------------------------------------------//
    constructor ( appState ) {
        super ();

        const fieldsArray = [
            new Fields.CryptoKeyFieldController     ( 'key',            '' ),
        ];
        this.initialize ( appState, fieldsArray );
    }

    //----------------------------------------------------------------//
    finalize () {
    }
}

//================================================================//
// KeyUtilScreen
//================================================================//
export const KeyUtilScreen = observer (( props ) => {

    const keyFieldController        = hooks.useFinalizable (() => new Fields.CryptoKeyFieldController ( 'key', '' ));

    const [ json, setJSON ]         = useState ( '' );

    const isEnabled                 = keyFieldController.isCompleteAndErrorFree;

    console.log ( 'ENABLED', isEnabled );

    const showPublicJSON = () => {
        setJSON ( JSON.stringify ( keyFieldController.key.getPublic ( 'json' ), null, 4 ));
    }

    const showPrivateJSON = () => {
        setJSON ( JSON.stringify ( keyFieldController.key.getPrivate ( 'json' ), null, 4 ));
    }

    return (
        <SingleColumnContainerView>

            <NavigationBar appState = { appState }/>

            <UI.Segment attached = 'bottom'>
                <UI.Form>
                    <Fields.CryptoKeyField  field = { keyFieldController }/>
                </UI.Form>
            </UI.Segment>

            <UI.Segment attached = 'top'>
                <UI.Button fluid color = 'teal' disabled = { !isEnabled } onClick = {() => { showPublicJSON ()}}>
                    Public JSON
                </UI.Button>
            </UI.Segment>

            <UI.Segment attached = 'bottom'>
                <UI.Button fluid color = 'red' disabled = { !isEnabled } onClick = {() => { showPrivateJSON ()}}>
                    Private JSON
                </UI.Button>
            </UI.Segment>

            <UI.Modal
                size        = 'large'
                closeIcon
                onClose     = {() => { setJSON ( '' )}}
                open        = { Boolean ( json )}
            >
                <UI.Modal.Header>Key</UI.Modal.Header>

                <UI.Modal.Content>
                    <UI.Form>

                        <UI.Menu attached = 'top'>
                            <UI.Menu.Menu position = "right">
                                <ClipboardMenuItem
                                    value = { json ? json : false }
                                />
                            </UI.Menu.Menu>
                        </UI.Menu>

                        <UI.Segment attached = 'bottom'>
                            <UI.Form.TextArea
                                readOnly
                                attached        = 'bottom'
                                style           = {{ fontFamily: 'monospace' }}
                                rows            = { 32 }
                                value           = { json }
                            />
                        </UI.Segment>
                    </UI.Form>
                </UI.Modal.Content>
            </UI.Modal>

        </SingleColumnContainerView>
    );
});
