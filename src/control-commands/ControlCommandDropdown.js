// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { COMMAND_TYPE }                                     from './ControlCommand';
import { ExtendNetworkFormController }                      from './ExtendNetworkFormController';
import { HardResetFormController }                          from './HardResetFormController';
import { SelectRewardFormController }                       from './SelectRewardFormController';
import { SetMinimumGratuityFormController }                 from './SetMinimumGratuityFormController';

import { assert, hooks, util }                              from 'fgc';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                                         from 'mobx-react';
import React, { useState }                                  from 'react';
import * as UI                                              from 'semantic-ui-react';

//----------------------------------------------------------------//
export const gCommandTypes = [
    COMMAND_TYPE.EXTEND_NETWORK,
    COMMAND_TYPE.HARD_RESET,
    COMMAND_TYPE.SELECT_REWARD,
    COMMAND_TYPE.SET_MINIMUM_GRATUITY,
];

//----------------------------------------------------------------//
function makeControllerForCommandType ( appState, commandType ) {

    switch ( commandType ) {
        case COMMAND_TYPE.EXTEND_NETWORK:           return new ExtendNetworkFormController ( appState );
        case COMMAND_TYPE.HARD_RESET:               return new HardResetFormController ( appState );
        case COMMAND_TYPE.SELECT_REWARD:            return new SelectRewardFormController ( appState );
        case COMMAND_TYPE.SET_MINIMUM_GRATUITY:     return new SetMinimumGratuityFormController ( appState );
    }
    return new ControlCommandFormController ( appState );
}

//================================================================//
// ControlCommandDropdown
//================================================================//
export const ControlCommandDropdown = observer (( props ) => {

    const { appState, controller, setController } = props;

    const onSelection = ( commandType ) => {
        if ( !controller || ( controller.type !== commandType )) {
            setController ( makeControllerForCommandType ( appState, commandType ));
        }
    }

    let options = [];

    for ( let typeID in gCommandTypes ) {
        const commandType = gCommandTypes [ typeID ];
        if ( controller && ( controller.type === commandType )) continue;

        const item = (
            <UI.Dropdown.Item
                key         = { commandType }
                text        = { COMMAND_TYPE.friendlyNameForType ( commandType )}
                onClick     = {() => { onSelection ( commandType )}}
            />
        );
        options.push ( item );
    }

    return (
        <UI.Menu>
            <UI.Dropdown
                fluid
                search
                item
                placeholder     = 'Miner Control Command'
                text            = { controller ? controller.friendlyName : '' }
            >
                <UI.Dropdown.Menu>
                    { options }
                </UI.Dropdown.Menu>
            </UI.Dropdown>
        </UI.Menu>
    );
});
