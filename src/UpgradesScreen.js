// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { UpgradesFormController }                       from './UpgradesFormController';
import { InventoryTransactionScreen }                   from './InventoryTransactionScreen';
import { observer }                                     from 'mobx-react';
import React, { useState }                              from 'react';

//================================================================//
// UpgradesScreen
//================================================================//
export const UpgradesScreen = observer (( props ) => {

    return (
        <InventoryTransactionScreen
            { ...props }
            controllerFactory = {( appState, inventory ) => { return new UpgradesFormController ( appState, inventory )}}
        />
    );
});
