// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { TransactionBalanceHeader, TransactionFormFields } from './BasicTransactionForm';
import { TransactionFormInput }             from './TransactionFormInput';
import { AssetView }                        from 'cardmotron';
import { assert, excel, hooks, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import * as UI                              from 'semantic-ui-react';

//================================================================//
// UpgradeItem
//================================================================//
const UpgradeItem = observer (( props ) => {

    const { controller, upgradeID, showModal } = props;

    const schema    = controller.inventory.schema;
    const upgrade   = controller.upgrades [ upgradeID ];

    const options = [];
    for ( let option of upgrade.options ) {

        options.push (
            <UI.Dropdown.Item
                key         = { option }
                text        = { schema.getFriendlyNameForType ( option )}
                onClick     = {() => { controller.select ( upgradeID, option )}}
            />
        );
    }

    const toggle = () => { controller.toggle ( upgradeID )}

    const name = schema.getFriendlyNameForAsset ( upgrade.asset );
    const enabled = controller.isEnabled ( upgradeID );

    return (
        <UI.Table.Row
            positive = { enabled }
            negative = { !enabled }
        >
            <UI.Table.Cell
                collapsing
                onClick = {() => { showModal ( upgradeID )}}
                style = {{ cursor: 'pointer' }}
            >
                <div style = {{ fontWeight: 'bold' }}>
                    { name }
                </div>
                <div style = {{ fontSize: '12px' }}>
                    { upgrade.asset.assetID }
                </div>
            </UI.Table.Cell>

            <UI.Table.Cell>
                <UI.Dropdown
                    fluid
                    selection
                    text = { schema.getFriendlyNameForType ( upgrade.selected )}
                    options = { options }
                />
            </UI.Table.Cell>
            <UI.Table.Cell
                collapsing
                onClick = { toggle }
                style = {{ cursor: 'pointer' }}
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
// UpgradeModal
//================================================================//
const UpgradeModal = observer (( props ) => {

    const { controller, upgradeID, setUpgrade } = props;

    if ( upgradeID === false ) {
        return ( <React.Fragment/> );
    }

    const upgrade       = controller.upgrades [ upgradeID ];
    const inventory     = controller.inventory;
    const schema        = inventory.schema;
    const asset         = upgrade.asset;
    
    const tabs = [];
    const assetViews = {};

    for ( let option of upgrade.options ) {

        let name = schema.getFriendlyNameForType ( option );
        let type = option;

        if ( option === asset.type ) {
            name = schema.getFriendlyNameForAsset ( asset );
            type = asset.assetID;
        }

        tabs.push (
            <UI.Menu.Item
                key     = { option }
                name    = { name }
                active  = { upgrade.selected === option }
                onClick = {() => { controller.select ( upgrade.upgradeID, option )}}
            />
        );

        assetViews [ option ] = (
            <AssetView
                assetID = { type }
                inventory = { inventory }
            />
        );
    }

    const fromName = schema.getFriendlyNameForAsset ( upgrade.asset );
    const toName = schema.getFriendlyNameForType ( upgrade.selected );

    return (
        <UI.Modal
            closeIcon
            onClose = {() => {
                setUpgrade ( false );
            }}
            open = { upgrade !== false }
        >
            <UI.Modal.Header>{ `Upgrade '${ fromName }' to '${ toName }'` }</UI.Modal.Header>
            
            <UI.Modal.Content>

                <UI.Menu attached='top' tabular>
                    { tabs }
                </UI.Menu>

                <UI.Segment attached='bottom'>
                    <center>
                        { assetViews [ upgrade.selected ]}
                    </center>
                </UI.Segment>
                
            </UI.Modal.Content>
        </UI.Modal>
    );
});

//================================================================//
// UpgradesForm
//================================================================//
export const UpgradesForm = observer (( props ) => {

    const { controller } = props;
    const [ upgradeForModal, setUpgradeForModal ] = useState ( false );

    if ( controller.upgrades.length === 0 ) {
        return (
            <UI.Message>
                <UI.Message.Header>No Upgrades Available</UI.Message.Header>
                <p>
                    You currently don't have any assets eligible
                    for upgrades.
                </p>
            </UI.Message>
        );
    }

    const upgradeList = [];
    for ( let index in controller.upgrades ) {

        upgradeList.push (
            <UpgradeItem
                key         = { index }
                controller  = { controller }
                upgradeID   = { index }
                showModal   = { setUpgradeForModal }
            />
        );
    }

    return (
        <UI.Segment>

            <UpgradeModal
                controller  = { controller }
                upgradeID   = { upgradeForModal }
                setUpgrade  = { setUpgradeForModal }
            />

            <TransactionBalanceHeader controller = { controller }/>

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
                                fluid
                                color = 'teal'
                                attached = 'top'
                                disabled = { controller.totalEnabled === 0 }
                                onClick = {() => { controller.enableAll ( false )}}
                            >
                                Min
                            </UI.Button>

                            <UI.Button
                                fluid
                                color = 'teal'
                                attached = 'bottom'
                                disabled = { controller.totalEnabled === controller.total }
                                onClick = {() => { controller.enableAll ( true )}}
                            >
                                Max
                            </UI.Button>

                        </UI.Table.HeaderCell>
                    </UI.Table.Row>
                </UI.Table.Footer>
            </UI.Table>

            <UI.Form>
                <TransactionFormFields controller = { controller }/>
            </UI.Form>
        </UI.Segment>
    );
});
