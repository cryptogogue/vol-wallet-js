// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { CraftingAssetSelectionModal }      from './CraftingAssetSelectionModal';
import { TransactionBalanceHeader, TransactionFormFields } from './BasicTransactionForm';
import { TransactionFormInput }             from './TransactionFormInput';
import { AssetCardView }                    from 'cardmotron';
import { assert, excel, hooks, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import * as UI                              from 'semantic-ui-react';

//================================================================//
// InvocationField
//================================================================//
const InvocationField = observer (( props ) => {

    const { controller, invocation, index } = props;
    const [ paramModalState, setParamModalState ] = useState ( false );

    const paramList = [];
    for ( let paramName in invocation.assetParams ) {

        let name = '';
        const assetID = invocation.assetParams [ paramName ] || '';

        if ( assetID ) {
            const asset = controller.inventory.assets [ assetID ];
            name = controller.inventory.schema.getFriendlyNameForAsset ( asset );
        }

        paramList.push (
            <UI.Table.Row
                key = { paramName }
                onClick = {() => {
                    setParamModalState ({
                        invocation:     invocation,
                        paramName:      paramName,
                    });
                }}
            >
                <UI.Table.Cell collapsing>
                    { paramName }
                </UI.Table.Cell>

                <UI.Table.Cell>
                    { name }
                </UI.Table.Cell>

                <If condition = { name !== assetID }>
                    <UI.Table.Cell collapsing>
                        { assetID }
                    </UI.Table.Cell>
                </If>
            </UI.Table.Row>
        );
    }

    return (
        <React.Fragment>

            <CraftingAssetSelectionModal
                controller          = { controller }
                paramModalState     = { paramModalState }
                setParamModalState  = { setParamModalState }
            />

            <UI.Menu
                attached = 'top'
                color = { invocation.hasErrors ? 'red' : 'teal' }
                borderless
                inverted
                compact
            >
                <UI.Menu.Item header>
                    { invocation.method.friendlyName }
                </UI.Menu.Item>
                <If condition = { controller.singleInvocation !== true }>
                    <UI.Menu.Menu position = 'right'>
                        <UI.Menu.Item
                            icon = 'times circle'
                            onClick = {() => { controller.removeInvocation ( index )}}
                        />
                    </UI.Menu.Menu>
                </If>
            </UI.Menu>

            <UI.Table attached = 'bottom' celled unstackable>
                <UI.Table.Body>
                    { paramList }
                </UI.Table.Body>
            </UI.Table>

        </React.Fragment>
    );
});

//================================================================//
// MethodDropdown
//================================================================//
const MethodDropdown = observer (( props ) => {

    const { controller, addInvocation } = props;

    let dropdownOptions = [];
    let hasValidMethod = false;

    const binding = controller.binding;
    for ( let methodName in binding.methodsByName ) {

        const method = binding.methodsByName [ methodName ];
        const isValid = binding.methodIsValid ( methodName );
        
        dropdownOptions.push (
            <UI.Dropdown.Item
                key         = { methodName }
                text        = { method.friendlyName }
                disabled    = { !isValid }
                onClick     = {( event, data ) => { addInvocation ( methodName )}}
            />
        );
        hasValidMethod = hasValidMethod || isValid;
    }

    return (
        <UI.Form.Dropdown
            fluid
            selection
            options     = { dropdownOptions }
            text        = 'Add Command'
            disabled    = { !( hasValidMethod && controller.canAddInvocation )}
        />
    );
});

//================================================================//
// CraftingForm
//================================================================//
export const CraftingForm = observer (( props ) => {

    const { controller } = props;

    const addInvocation = ( methodName ) => {
        controller.addInvocation ( methodName );
    }

    const invocationFields = [];
    for ( let i in controller.invocations ) {
        invocationFields.push (
            <InvocationField
                key         = { i }
                controller  = { controller }
                invocation  = { controller.invocations  [ i ]}
                index       = { i }
            />
        );
    }

    const showDropdown = controller.singleInvocation !== true;

    return (
        <UI.Segment>
            <TransactionBalanceHeader controller = { controller }/>
            <UI.Form>
                { invocationFields }

                <If condition = { controller.hasErrors }>
                    <UI.Message icon negative>
                        <UI.Icon name = 'warning circle'/>
                        <UI.Message.Content>
                            <UI.Message.Header>Error</UI.Message.Header>
                            <p>One or more multi-parameter constraints have not been satisfied.</p>
                        </UI.Message.Content>
                    </UI.Message>
                </If>

                <If condition = { showDropdown }>
                    <MethodDropdown
                        key             = { controller.invocations.length }
                        controller      = { controller }
                        addInvocation   = { addInvocation }
                    />
                </If>
                <TransactionFormFields controller = { controller }/>
            </UI.Form>
        </UI.Segment>
    );
});
