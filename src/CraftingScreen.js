// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { CraftingFormController }                       from './CraftingFormController';
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
            controllerFactory = {( appState, inventory ) => { return new CraftingFormController ( appState, inventory )}}
        />
    );
});
