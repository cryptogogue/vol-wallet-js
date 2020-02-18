// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AccountInfoService }                               from './AccountInfoService';
import { AccountNavigationBar, ACCOUNT_TABS }               from './AccountNavigationBar';
import { AppStateService }                                  from './AppStateService';
import { InventoryFilterDropdown }                          from './InventoryFilterDropdown';
import { InventoryTagController }                           from './InventoryTagController';
import { InventoryTagDropdown }                             from './InventoryTagDropdown';
import { TransactionFormController_UpgradeAssets }          from './TransactionFormController';
import { TransactionModal }                                 from './TransactionModal';
import { AssetModal, AssetTagsModal, inventoryMenuItems, InventoryService, InventoryViewController, InventoryPrintView, InventoryView } from 'cardmotron';
import { assert, excel, hooks, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import _                                                    from 'lodash';
import { action, computed, extendObservable, observable }   from "mobx";
import { observer }                                         from 'mobx-react';
import React, { useState }                                  from 'react';
import { Link }                                             from 'react-router-dom';
import * as UI                                              from 'semantic-ui-react';

//================================================================//
// UpgradesController
//================================================================//
export class UpgradesController {

    @observable upgrades = false;

    //----------------------------------------------------------------//
    @action
    affirm ( inventory, appState ) {

        if ( this.upgrades ) return;

        const assetsUtilized = appState ? appState.assetsUtilized : [];

        this.inventory = inventory;

        const assets = inventory.availableAssetsArray;
        if ( !assets.length ) return;

        const upgrades = [];

        for ( let asset of assets ) {

            if ( assetsUtilized.includes ( asset.assetID )) continue;

            const forAsset = inventory.getUpgradesForAssetID ( asset.assetID );
            if ( forAsset ) {
                upgrades.push ({
                    asset:      asset,
                    assetID:    asset.assetID,
                    selected:   forAsset [ forAsset.length - 1 ],
                    options:    forAsset,
                });
            }
        }
        this.upgrades = upgrades;
    }

    //----------------------------------------------------------------//
    @action
    clear () {

        this.upgrades = false;
    }

    //----------------------------------------------------------------//
    constructor () {
    }

    //----------------------------------------------------------------//
    @action
    enableAll ( enabled ) {

        for ( let upgrade of this.upgrades ) {
            upgrade.selected = enabled ? upgrade.options [ upgrade.options.length - 1 ] : upgrade.asset.type;
        }
    }

    //----------------------------------------------------------------//
    finalize () {
    }

    //----------------------------------------------------------------//
    getFriendlyName ( option ) {

        if ( this.inventory ) {
            const definition = this.inventory.schema.definitions [ option ];
            return definition.fields.name ? definition.fields.name.value : option;
        }
        return option;
    }

    //----------------------------------------------------------------//
    @action
    isEnabled ( upgradeID ) {

        const upgrade = this.upgrades [ upgradeID ];
        return ( upgrade.asset.type !== upgrade.selected );
    }

    //----------------------------------------------------------------//
    @action
    select ( upgradeID, option ) {

        this.upgrades [ upgradeID ].selected = option;
    }

    //----------------------------------------------------------------//
    @action
    toggle ( upgradeID ) {

        const upgrade = this.upgrades [ upgradeID ];
        const max = upgrade.options [ upgrade.options.length - 1 ];

        upgrade.selected = ( upgrade.asset.type === upgrade.selected ) ? max : upgrade.asset.type;
    }

    //----------------------------------------------------------------//
    @computed get
    total () {

        return this.upgrades ? this.upgrades.length : 0;
    }

    //----------------------------------------------------------------//
    @computed get
    totalEnabled () {

        if ( !this.upgrades ) return 0;
        
        let enabled = 0;
        for ( let upgrade of this.upgrades ) {
            if ( upgrade.asset.type !== upgrade.selected ) {
                ++enabled;
            }
        }
        return enabled;
    }

    //----------------------------------------------------------------//
    @computed get
    upgradeMap () {

        const map = {};
        if ( this.upgrades ) {
            for ( let upgrade of this.upgrades ) {
                if ( upgrade.asset.type !== upgrade.selected ) {
                    map [ upgrade.assetID ] = upgrade.selected;
                }
            }
        }
        return map;
    }
};

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
export const UpgradesScreen = observer (( props ) => {

    const networkIDFromEndpoint = util.getMatch ( props, 'networkID' );
    const accountIDFromEndpoint = util.getMatch ( props, 'accountID' );

    const [ progressMessage, setProgressMessage ]               = useState ( '' );
    const [ transactionController, setTransactionController ]   = useState ( false );

    const appState              = hooks.useFinalizable (() => new AppStateService ( networkIDFromEndpoint, accountIDFromEndpoint ));
    const accountInfoService    = hooks.useFinalizable (() => new AccountInfoService ( appState ));
    const inventory             = hooks.useFinalizable (() => new InventoryService ( setProgressMessage, appState.network.nodeURL, appState.accountID ));
    const controller            = hooks.useFinalizable (() => new UpgradesController ());

    const hasAssets = (( inventory.loading === false ) && ( inventory.availableAssetsArray.length > 0 ));

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

                <Choose>
                    <When condition = { inventory.loading }>
                        <UI.Loader
                            active
                            inline = 'centered'
                            size = 'massive'
                            style = {{ marginTop:'5%' }}
                        >
                            { progressMessage }
                        </UI.Loader>
                    </When>

                    <When condition = { controller.total > 0 }>

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

                    </When>
                </Choose>

                <TransactionModal
                    appState    = { appState }
                    controller  = { transactionController }
                    onClose     = { onCloseTransactionModal }
                />

            </SingleColumnContainerView>
        </React.Fragment>
    );
});
