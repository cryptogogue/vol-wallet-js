// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AccountInfoService }                               from './AccountInfoService';
import { AccountNavigationBar, ACCOUNT_TABS }               from './AccountNavigationBar';
import { AppStateService }                                  from './AppStateService';
import { InventoryFilterDropdown }                          from './InventoryFilterDropdown';
import { InventoryService }                                 from './InventoryService';
import { InventoryTagController }                           from './InventoryTagController';
import { InventoryTagDropdown }                             from './InventoryTagDropdown';
import { TransactionFormController_UpgradeAssets }          from './TransactionFormController_UpgradeAssets';
import { TransactionModal }                                 from './TransactionModal';
import { UpgradesController }                               from './UpgradesController';
import { AssetModal, AssetTagsModal, inventoryMenuItems, InventoryController, InventoryViewController, InventoryPrintView, InventoryView } from 'cardmotron';
import { assert, hooks, ProgressController, ProgressSpinner, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import _                                                    from 'lodash';
import { action, computed, extendObservable, observable }   from "mobx";
import { observer }                                         from 'mobx-react';
import React, { useState }                                  from 'react';
import { Link }                                             from 'react-router-dom';
import * as UI                                              from 'semantic-ui-react';

//================================================================//
// UpgradeItem
//================================================================//
const UpgradeItem = observer (( props ) => {

    const { controller, upgradeID } = props;

    const upgrade = controller.upgrades [ upgradeID ];

    const options = [];
    for ( let option of upgrade.options ) {

        options.push (
            <UI.Dropdown.Item
                key         = { option }
                text        = { controller.getFriendlyName ( option )}
                onClick     = {() => { controller.select ( upgradeID, option )}}
            />
        );
    }

    const toggle = () => { controller.toggle ( upgradeID )}

    const name = upgrade.asset.fields.name ? upgrade.asset.fields.name.value : upgrade.assetID;
    const enabled = controller.isEnabled ( upgradeID );

    return (
        <UI.Table.Row
            positive = { enabled }
            negative = { !enabled }
        >
            <UI.Table.Cell
                collapsing
                onClick = { toggle }
            >
                { name }
            </UI.Table.Cell>
            <UI.Table.Cell>
                <UI.Dropdown
                    fluid
                    selection
                    text = { controller.getFriendlyName ( upgrade.selected )}
                    options = { options }
                />
            </UI.Table.Cell>
            <UI.Table.Cell
                collapsing
                onClick = { toggle }
            >
                <Choose>
                    <When condition = { enabled }>
                        <UI.Icon name = 'check'/>
                    </When>
                    <Otherwise>
                        <UI.Icon name = 'dont'/>
                    </Otherwise>
                </Choose>
            </UI.Table.Cell>
        </UI.Table.Row>
    );
});

//================================================================//
// UpgradesScreen
//================================================================//
const UpgradesScreenBody = observer (( props ) => {

    const { appState, selectedMethod, onFinish } = props;
    const [ transactionController, setTransactionController ] = useState ( false );

    const progress              = hooks.useFinalizable (() => new ProgressController ());
    const inventory             = hooks.useFinalizable (() => new InventoryController ( progress ));
    const inventoryService      = hooks.useFinalizable (() => new InventoryService ( appState, inventory, progress ));
    const controller            = hooks.useFinalizable (() => new UpgradesController ());

    const hasAssets = (( progress.loading === false ) && ( inventory.availableAssetsArray.length > 0 ));

    if ( hasAssets ) {
        controller.affirm ( inventory, appState );
    }

    const upgradeList = [];
    for ( let i in controller.upgrades ) {
        upgradeList.push (
            <UpgradeItem
                key = { i }
                controller = { controller }
                upgradeID = { i }
            />
        );
    }

    const openTransactionModal = () => {

        console.log ( 'MAP:', JSON.stringify ( controller.upgradeMap, null, 4 ));

        setTransactionController (
            new TransactionFormController_UpgradeAssets (
                appState,
                controller.upgradeMap
            )
        );
    }

    const onCloseTransactionModal = () => {
        setTransactionController ( false );
        controller.clear ();
    }

    return (
        <React.Fragment>

            <SingleColumnContainerView>

                <AccountNavigationBar
                    appState    = { appState }
                    tab         = { ACCOUNT_TABS.UPGRADES }
                />

                <ProgressSpinner loading = { progress.loading } message = { progress.message }>
                    <If condition = { controller.total > 0 }>
                        <UI.Table celled unstackable>
                            <UI.Table.Header>
                                <UI.Table.Row>
                                    <UI.Table.HeaderCell>Name</UI.Table.HeaderCell>
                                    <UI.Table.HeaderCell>Upgrade</UI.Table.HeaderCell>
                                    <UI.Table.HeaderCell/>
                                </UI.Table.Row>
                            </UI.Table.Header>

                            <UI.Table.Body>
                                { upgradeList }
                            </UI.Table.Body>

                            <UI.Table.Footer fullWidth>
                                <UI.Table.Row>
                                    <UI.Table.HeaderCell colSpan='4'>

                                        <UI.Button
                                            color = 'teal'
                                            disabled = { controller.totalEnabled === controller.total }
                                            onClick = {() => { controller.enableAll ( true )}}
                                        >
                                            Select All
                                        </UI.Button>
                                        
                                        <UI.Button
                                            color = 'red'
                                            disabled = { controller.totalEnabled === 0 }
                                            onClick = {() => { controller.enableAll ( false )}}
                                        >
                                            Deselect All
                                        </UI.Button>

                                        <UI.Button
                                            floated = 'right'
                                            primary
                                            disabled = { controller.totalEnabled === 0 }
                                            onClick = { openTransactionModal }
                                        >
                                            Submit
                                        </UI.Button>

                                    </UI.Table.HeaderCell>
                                </UI.Table.Row>
                            </UI.Table.Footer>
                        </UI.Table>
                    </If>
                </ProgressSpinner>

                <TransactionModal
                    appState    = { appState }
                    controller  = { transactionController }
                    open        = { transactionController !== false }
                    onClose     = { onCloseTransactionModal }
                />

            </SingleColumnContainerView>
        </React.Fragment>
    );
});

//================================================================//
// UpgradesScreen
//================================================================//
export const UpgradesScreen = observer (( props ) => {

    const networkIDFromEndpoint     = util.getMatch ( props, 'networkID' );
    const accountIDFromEndpoint     = util.getMatch ( props, 'accountID' );

    const appState                  = hooks.useFinalizable (() => new AppStateService ( networkIDFromEndpoint, accountIDFromEndpoint ));
    const accountInfoService        = hooks.useFinalizable (() => new AccountInfoService ( appState ));

    const [ counter, setCounter ]   = useState ( 0 );

    const onFinish = () => {
        setCounter ( counter + 1 );
    }

    return (
        <UpgradesScreenBody
            key                 = { `${ counter }` }
            appState            = { appState }
            onFinish            = { onFinish }
        />
    );
});
