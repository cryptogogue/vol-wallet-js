// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.


import { AccountInfoService }                           from './AccountInfoService';
import { AppStateService }                              from './AppStateService';
import { PasswordInputField }                           from './PasswordInputField';
import { InventoryService }                             from './InventoryService';
import { TransactionForm }                              from './TransactionForm';
import { InventoryController }                          from 'cardmotron';
import { assert, hooks, ProgressController, ProgressSpinner, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import { action, computed, extendObservable, observable } from 'mobx';
import { observer }                                     from 'mobx-react';
import { AccountNavigationBar, ACCOUNT_TABS }           from './AccountNavigationBar';
import React, { useState }                              from 'react';
import { Redirect }                                     from 'react-router';
import * as UI                                          from 'semantic-ui-react';

//================================================================//
// InventoryTransactionScreenBody
//================================================================//
const InventoryTransactionScreenBody = observer (( props ) => {

    const { controllerFactory, onFinish } = props;

    const networkIDFromEndpoint     = util.getMatch ( props, 'networkID' );
    const accountIDFromEndpoint     = util.getMatch ( props, 'accountID' );

    const appState                  = hooks.useFinalizable (() => new AppStateService ( networkIDFromEndpoint, accountIDFromEndpoint ));
    const accountInfoService        = hooks.useFinalizable (() => new AccountInfoService ( appState ));
    const progress                  = hooks.useFinalizable (() => new ProgressController ());
    const inventory                 = hooks.useFinalizable (() => new InventoryController ( progress ));
    const inventoryService          = hooks.useFinalizable (() => new InventoryService ( appState, inventory, progress ));
    const transactionController     = hooks.useFinalizable (() => controllerFactory ( appState, inventory ));

    const [ password, setPassword ] = useState ( '' );

    const stageEnabled      = appState.hasAccountInfo && transactionController.isCompleteAndErrorFree;
    const submitEnabled     = stageEnabled && appState.checkPassword ( password );
    const submitLabel       = appState.stagedTransactions.length > 0 ? 'Submit Transactions' : 'Submit Transaction';

    const submit = () => {
        appState.pushTransaction ( transactionController.transaction );
        if ( submitEnabled ) {
            appState.submitTransactions ( password );
        }
    }

    return (
        <div>
            <SingleColumnContainerView>

                <AccountNavigationBar
                    appState    = { appState }
                    tab         = { ACCOUNT_TABS.CRAFTING }
                />

                <ProgressSpinner loading = { progress.loading } message = { progress.message }>

                    <TransactionForm
                        controller  = { transactionController }
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
// InventoryTransactionScreen
//================================================================//
export const InventoryTransactionScreen = observer (( props ) => {

    const [ counter, setCounter ]   = useState ( 0 );

    const onFinish = () => {
        setCounter ( counter + 1 );
    }

    return (
        <InventoryTransactionScreenBody
            { ...props }
            key                 = { `${ counter }` }
            onFinish            = { onFinish }
        />
    );
});
