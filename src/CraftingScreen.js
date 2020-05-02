// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.


import { AccountInfoService }                           from './AccountInfoService';
import { AppStateService }                              from './AppStateService';
import { CraftingForm }                                 from './CraftingForm';
import { CraftingFormController }                       from './CraftingFormController';
import { PasswordInputField }                           from './PasswordInputField';
import { InventoryService }                             from 'cardmotron';
import { assert, excel, hooks, RevocableContext, SingleColumnContainerView, util } from 'fgc';
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
    
    const [ progressMessage, setProgressMessage ] = useState ( '' );
    const [ password, setPassword ] = useState ( '' );

    const nodeURL                   = appState.hasAccountInfo ? appState.network.nodeURL : false;
    const inventory                 = hooks.useFinalizable (() => new InventoryService ( setProgressMessage, nodeURL, appState.accountID ));
    const craftingFormController    = hooks.useFinalizable (() => new CraftingFormController ( appState, inventory ));

    if ( inventory.loading === true ) {
        return (
            <div>
                <UI.Loader active inline='centered' size='massive' style={{marginTop:'5%'}}>{ progressMessage }</UI.Loader>
            </div>
        );
    }

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
