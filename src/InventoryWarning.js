// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { observer }                         from 'mobx-react';
import React                                from 'react';
import * as UI                              from 'semantic-ui-react';

//================================================================//
// InventoryWarning
//================================================================//
export const InventoryWarning = observer (( props ) => {

    const { inventoryService } = props;

    return (
        <If condition = { inventoryService.warning }>
            <UI.Message icon warning>
                <UI.Icon name = 'warning sign'/>
                <UI.Message.Content>
                    <UI.Message.Header>Warning</UI.Message.Header>
                    <p>Inventory sync mismatch detected. This might go away if you refresh, or you might need to manually resync your inventory.</p>
                </UI.Message.Content>
            </UI.Message>
        </If>
    );
});
