// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.


import { AccountInfoService }                           from './AccountInfoService';
import { AppStateService }                              from './AppStateService';
import { CraftingForm }                                 from './CraftingForm';
import { CraftingFormController }                       from './CraftingFormController';
import { PasswordInputField }                           from './PasswordInputField';
import { InventoryController }                          from 'cardmotron';
import { InventoryService }                             from './InventoryService';
import { assert, hooks, ProgressController, ProgressSpinner, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import { action, computed, extendObservable, observable } from 'mobx';
import { observer }                                     from 'mobx-react';
import { AccountNavigationBar, ACCOUNT_TABS }           from './AccountNavigationBar';
import React, { useState }                              from 'react';
import { Redirect }                                     from 'react-router';
import * as UI                                          from 'semantic-ui-react';

//================================================================//
// CraftingScreenBody
//================================================================//
const CraftingScreenBody = observer (( props ) => {

    const { appState, selectedMethod, onFinish } = props;
    
    const [ password, setPassword ] = useState ( '' );

    const progress                  = hooks.useFinalizable (() => new ProgressController ());
    const inventory                 = hooks.useFinalizable (() => new InventoryController ( progress ));
    const inventoryService          = hooks.useFinalizable (() => new InventoryService ( appState, inventory, progress ));
    const craftingFormController    = hooks.useFinalizable (() => new CraftingFormController ( appState, inventory ));

    const stageEnabled      = appState.hasAccountInfo && craftingFormController.isCompleteAndErrorFree;
    const submitEnabled     = stageEnabled && appState.checkPassword ( password );
    const submitLabel       = appState.stagedTransactions.length > 0 ? 'Submit Transactions' : 'Submit Transaction';

    const submit = () => {
        appState.pushTransaction ( craftingFormController.transaction );
        if ( submitEnabled ) {
            appState.submitTransactions ( password );
        }
        onFinish ();
    }

    return (
        <div>
            <SingleColumnContainerView>

                <AccountNavigationBar
                    appState    = { appState }
                    tab         = { ACCOUNT_TABS.CRAFTING }
                />

                <ProgressSpinner loading = { progress.loading } message = { progress.message }>

                    <CraftingForm
                        controller  = { craftingFormController }
                    />

                    <UI.Segment>
                        <UI.Form>

                            <PasswordInputField
                                appState = { appState }
                                setPassword = { setPassword }
                            />

                            <UI.Form.Field>
                                <UI.Button
                                    fluid
                                    color = 'teal'
                                    attached = 'top'
                                    disabled = { submitEnabled || !stageEnabled }
                                    onClick = {() => { submit ()}}
                                >
                                    Stage Transaction
                                </UI.Button>

                                <UI.Button
                                    fluid
                                    color = 'teal'
                                    attached = 'bottom'
                                    disabled = { !submitEnabled }
                                    onClick = {() => { submit ()}}
                                >
                                    { submitLabel }
                                </UI.Button>
                            </UI.Form.Field>

                        </UI.Form>
                    </UI.Segment>

                </ProgressSpinner>

            </SingleColumnContainerView>
        </div>
    );
});

//================================================================//
// CraftingScreen
//================================================================//
export const CraftingScreen = observer (( props ) => {

    const networkIDFromEndpoint     = util.getMatch ( props, 'networkID' );
    const accountIDFromEndpoint     = util.getMatch ( props, 'accountID' );

    const appState                  = hooks.useFinalizable (() => new AppStateService ( networkIDFromEndpoint, accountIDFromEndpoint ));
    const accountInfoService        = hooks.useFinalizable (() => new AccountInfoService ( appState ));

    const [ counter, setCounter ]   = useState ( 0 );

    const onFinish = () => {
        setCounter ( counter + 1 );
    }

    return (
        <CraftingScreenBody
            key                 = { `${ counter }:${ appState.nonce }` }
            appState            = { appState }
            onFinish            = { onFinish }
        />
    );
});
