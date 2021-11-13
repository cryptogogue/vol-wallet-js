// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { CraftingAssetSelectionModal }      from './CraftingAssetSelectionModal';
import { InvocationField }                  from './InvocationField';
import CryptoJS                             from 'crypto-js';
import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import * as UI                              from 'semantic-ui-react';
import * as vol                             from 'vol';

//================================================================//
// CraftingMethodDropdown
//================================================================//
export const CraftingMethodDropdown = observer (( props ) => {

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
