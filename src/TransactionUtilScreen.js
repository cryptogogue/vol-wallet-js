// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                                          from './fields/fields'
import { NavigationBar }                                    from './NavigationBar';
import { AppStateService }                                  from './services/AppStateService';
import { TransactionDropdown }                              from './transactions/TransactionDropdown';
import { TransactionForm }                                  from './transactions/TransactionForm';
import _                                                    from 'lodash';
import { ClipboardMenuItem, hooks, SingleColumnContainerView, util } from 'fgc';
import { observable }                                       from "mobx";
import { observer }                                         from 'mobx-react';
import React, { useState }                                  from 'react';
import * as UI                                              from 'semantic-ui-react';

const appState = AppStateService.get ();

//================================================================//
// TransactionContext
//================================================================//
export class TransactionContext {

    @observable accountID       = '';
    @observable isStandaloneTransactionContext = true;

    //----------------------------------------------------------------//
    checkTransactionEntitlements () {
        return true;
    }

    //----------------------------------------------------------------//
    constructor () {
    }

    //----------------------------------------------------------------//
    getDefaultAccountKeyName () {
        return 'master';
    }

    //----------------------------------------------------------------//
    getFeeSchedule () {
        return false;
    }

    //----------------------------------------------------------------//
    getKeyNamesForTransaction () {
        return [ 'master' ];
    }

    //----------------------------------------------------------------//
    getMinimumGratuity () {
        
        return 0;
    }

}

//================================================================//
// TransactionUtilController
//================================================================//
export class TransactionUtilController extends Fields.FormController {

    //----------------------------------------------------------------//
    constructor ( appState ) {
        super ();

        const fieldsArray = [
            new Fields.StringFieldController        ( 'accountName',    'Account Name' ),
            new Fields.CryptoKeyFieldController     ( 'key',            '' ),
            new Fields.StringFieldController        ( 'keyName',        'Key Name' ),
            new Fields.IntegerFieldController       ( 'nonce',          'Nonce' ),
        ];
        this.initialize ( appState, fieldsArray );
    }
}

//================================================================//
// TransactionUtilScreen
//================================================================//
export const TransactionUtilScreen = observer (( props ) => {

    const transactionContext        = hooks.useFinalizable (() => new TransactionContext ());
    const formController            = hooks.useFinalizable (() => new TransactionUtilController ( appState ));

    const [ nonce, setNonce ]               = useState ( undefined );
    const [ json, setJSON ]                 = useState ( '' );
    const [ controller, setController ]     = useState ( false );

    const onShowJSON = () => {

        const recordBy = new Date ();
        recordBy.setTime ( recordBy.getTime () + ( 8 * 60 * 60 * 1000 )); // TODO: this is gross, get from a field

        const body = controller.makeTransactionBody ();

        body.type           = controller.type;
        body.uuid           = util.generateUUIDV4 (); // TODO: get from a field
        body.maxHeight      = 0; // TODO: get from a field
        body.recordBy       = recordBy.toISOString ();

        body.maker.accountName      = formController.fields.accountName.value;
        body.maker.keyName          = formController.fields.keyName.value;
        body.maker.nonce            = formController.fields.nonce.value;

        const bodyString = JSON.stringify ( body );

        const key = formController.fields.key.value;

        const envelope = {
            body: bodyString,
            signature: {
                hashAlgorithm:  'SHA256',
                digest:         key.hash ( bodyString ),
                signature:      key.sign ( bodyString ),
            },
        };

        setJSON ( JSON.stringify ( envelope, null, 4 ));
    }

    const isEnabled = formController.isCompleteAndErrorFree && controller.isCompleteAndErrorFree;

    return (
        <SingleColumnContainerView>

            <NavigationBar appState = { appState }/>

            <UI.Segment attached = 'bottom'>
            
                <UI.Form>
                    <Fields.StringField     field = { formController.fields.accountName }/>
                    <Fields.CryptoKeyField  field = { formController.fields.key }/>
                    <Fields.StringField     field = { formController.fields.keyName }/>
                    <Fields.IntegerField    field = { formController.fields.nonce }/>
                </UI.Form>

                <TransactionDropdown
                    appState                = { transactionContext }
                    controller              = { controller }
                    setController           = { setController }
                    disabled                = { !formController.isCompleteAndErrorFree }
                />
                
                <If condition = { controller }>
                    <TransactionForm controller = { controller }/>

                    <UI.Button
                        fluid
                        color = "red"
                        size = "large"
                        disabled = { !isEnabled }
                        onClick = { onShowJSON }
                    >
                        Show JSON
                    </UI.Button>
                </If>
                
            </UI.Segment>

            <UI.Modal
                size = 'large'
                closeIcon
                onClose = {() => { setJSON ( '' )}}
                open = { Boolean ( json )}
            >
                <UI.Modal.Header>Transaction</UI.Modal.Header>

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
