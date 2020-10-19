// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { ACCOUNT_TABS }                                 from './AccountNavigationBar';
import { CraftingFormController }                       from './transactions/CraftingFormController';
import { InventoryTransactionScreen }                   from './InventoryTransactionScreen';
import { observer }                                     from 'mobx-react';
import React, { useState }                              from 'react';

//================================================================//
// CraftingScreen
//================================================================//
export const CraftingScreen = observer (( props ) => {

    return (
        <InventoryTransactionScreen
            { ...props }
            tab = { ACCOUNT_TABS.CRAFTING }
            controllerFactory = {( appState, inventory ) => { return new CraftingFormController ( appState, inventory )}}
        />
    );
});
