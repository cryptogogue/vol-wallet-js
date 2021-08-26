// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { observer }                         from 'mobx-react';
import React                                from 'react';
import * as UI                              from 'semantic-ui-react';

//================================================================//
// AssetSelectionField
//================================================================//
export const AssetSelectionField = observer (( props ) => {

    const assets = props.field ? props.field.assets : props.assets;

    const sorted = [];
    for ( let assetID in assets ) {
        sorted.push ( assets [ assetID ]);
    }
    sorted.sort (( asset0, asset1 ) => asset0.type.localeCompare ( asset1.type ));

    const list = [];
    for ( let asset of sorted ) {

        const assetID = asset.assetID;
        const name = asset.fields.name ? asset.fields.name.value : assetID;

        list.push (
            <UI.Table.Row key = { assetID }>
                <UI.Table.Cell collapsing>
                    { assetID }
                </UI.Table.Cell>

                <UI.Table.Cell>
                    { name }
                </UI.Table.Cell>
            </UI.Table.Row>
        );
    }

    return (
        <UI.Table celled unstackable>

            <UI.Table.Header>
                <UI.Table.Row>
                    <UI.Table.HeaderCell>Asset ID</UI.Table.HeaderCell>
                    <UI.Table.HeaderCell>Name</UI.Table.HeaderCell>
                </UI.Table.Row>
            </UI.Table.Header>

            <UI.Table.Body>
                { list }
            </UI.Table.Body>
        </UI.Table>
    );
});