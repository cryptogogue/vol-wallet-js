// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { CraftingAssetSelectionModal }      from './CraftingAssetSelectionModal';
import { InvocationAssetParamRow }          from './InvocationAssetParamRow';
import { InvocationConstParamField }        from './InvocationConstParamField';
import * as vol                             from '../util/vol';
import CryptoJS                             from 'crypto-js';
import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import * as UI                              from 'semantic-ui-react';

//================================================================//
// InvocationField
//================================================================//
export const InvocationField = observer (( props ) => {

    const { controller, invocation, index } = props;
    const [ paramModalState, setParamModalState ] = useState ( false );

    const assetParamRows = [];

    for ( let paramName in invocation.assetParams ) {
        assetParamRows.push (
            <InvocationAssetParamRow
                key         = { paramName }
                paramName   = { paramName }
                controller  = { controller }
                invocation  = { invocation }
                setParamModalState = { setParamModalState }
                error       = { invocation.hasErrors ? invocation.errorReport.paramErrors [ paramName ] : undefined }
            />
        );
    }

    const constParamFields = [];

    for ( let paramName in invocation.constParams ) {
        constParamFields.push (
            <InvocationConstParamField
                key         = { paramName }
                paramName   = { paramName }
                controller  = { controller }
                invocation  = { invocation }
                error       = { invocation.hasErrors ? invocation.errorReport.paramErrors [ paramName ] : undefined }
            />
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

            <UI.Segment attached = 'bottom'>


                <If condition = { assetParamRows.length > 0 }>
                    <UI.Table celled unstackable>
                        <UI.Table.Body>
                            { assetParamRows }
                        </UI.Table.Body>
                    </UI.Table>
                </If>


                <If condition = { constParamFields.length > 0 }>
                    { constParamFields }
                </If>
            </UI.Segment>

        </React.Fragment>
    );
});
