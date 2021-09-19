// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { CraftingAssetSelectionModal }      from './CraftingAssetSelectionModal';
import * as vol                             from '../util/vol';
import CryptoJS                             from 'crypto-js';
import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import * as UI                              from 'semantic-ui-react';

//================================================================//
// InvocationAssetParamRow
//================================================================//
export const InvocationAssetParamRow = observer (( props ) => {

    const { controller, paramName, invocation, setParamModalState } = props;

    let name = '';
    const assetID = invocation.assetParams [ paramName ] || '';

    if ( assetID ) {
        const asset = controller.inventory.rawAssets [ assetID ];
        name = controller.inventory.schema.getFriendlyNameForAsset ( asset );
    }

    return (
        <UI.Table.Row
            key = { paramName }
            onClick = {() => {
                setParamModalState ({
                    invocation:     invocation,
                    paramName:      paramName,
                });
            }}
            error = { props.error }
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
});
