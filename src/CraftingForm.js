// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { TransactionBalanceHeader, TransactionFormFields } from './BasicTransactionForm';
import { TransactionFormInput }             from './TransactionFormInput';
import { AssetCardView }                    from 'cardmotron';
import { assert, excel, hooks, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import * as UI                              from 'semantic-ui-react';

//================================================================//
// AssetSelectionModal
//================================================================//
const AssetSelectionModal = observer (( props ) => {

    const { controller, paramModalState, setParamModalState } = props;
    const [ closeTimeout, setCloseTimeout ] = useState ( false );

    if ( paramModalState === false ) {
        return ( <React.Fragment/> );
    }

    const { invocation, paramName } = paramModalState;
    const allOptions        = invocation.methodBinding.getParamOptions ( paramName );
    const availableOptions  = invocation.methodBinding.getParamOptions ( paramName, invocation.assetParams );

    const ingredients = [];
    for ( let assetID of allOptions ) {

        const isSelected    = ( invocation.assetParams [ paramName ] === assetID );
        const isAvailable   = availableOptions.includes ( assetID );

        const onSelect = ( asset, selected ) => {
            if ( !closeTimeout ) {
                controller.setAssetParam ( invocation, paramName, selected ? assetID : false );
                if ( selected ) {
                    setCloseTimeout ( setTimeout(() => {
                        setCloseTimeout ( false );
                        setParamModalState ( false );
                    }, 350 ));
                }
            }
        }

        ingredients.push (
            <div style = {{ display: 'block' }} key = { assetID }>
                <AssetCardView
                    assetID     = { assetID }
                    inventory   = { controller.inventory }
                    isSelected  = { isSelected }
                    disabled    = { !( isSelected || isAvailable )}
                    onSelect    = { onSelect }
                />
            </div>
        );
    }

    return (
        <UI.Modal
            closeIcon
            onClose = {() => {
                if ( closeTimeout ) {
                    clearTimeout ( closeTimeout );
                    setCloseTimeout ( false );
                }
                setParamModalState ( false )
            }}
            open = { paramModalState !== false }
        >
            <UI.Modal.Header>{ `Select Asset for '${ paramName }'` }</UI.Modal.Header>
            
            <UI.Modal.Content>
                { ingredients }
            </UI.Modal.Content>
        </UI.Modal>
    );
});

//================================================================//
// InvocationField
//================================================================//
const InvocationField = observer (( props ) => {

    const { controller, invocation, index } = props;
    const [ paramModalState, setParamModalState ] = useState ( false );

    const paramList = [];
    for ( let paramName in invocation.assetParams ) {

        const paramValue = invocation.assetParams [ paramName ];

        paramList.push (
            <UI.Table.Row key = { paramName }>
                <UI.Table.Cell collapsing>
                    { paramName }
                </UI.Table.Cell>

                <UI.Table.Cell
                    onClick = {() => {
                        setParamModalState ({
                            invocation:     invocation,
                            paramName:      paramName,
                        });
                    }}
                >
                    {( paramValue === false ) ? '' : paramValue }
                </UI.Table.Cell>
            </UI.Table.Row>
        );
    }

    return (
        <React.Fragment>

            <AssetSelectionModal
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
