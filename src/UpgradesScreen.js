// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { ACCOUNT_TABS }                                 from './AccountNavigationBar';
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
            tab = { ACCOUNT_TABS.UPGRADES }
            controllerFactory = {( appState, inventory ) => { return new UpgradesFormController ( appState, inventory )}}
        />
    );
});
