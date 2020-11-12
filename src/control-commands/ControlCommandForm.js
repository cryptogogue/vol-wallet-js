// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                              from '../fields/fields'
import * as vol                                 from '../util/vol';
import { COMMAND_TYPE }                         from './ControlCommand';
import { ExtendNetworkForm }                    from './ExtendNetworkForm';
import { HardResetForm }                        from './HardResetForm';
import { SelectRewardForm }                     from './SelectRewardForm';
import { SetMinimumGratuityForm }               from './SetMinimumGratuityForm';
import { assert, excel, hooks, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import _                                        from 'lodash';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                             from 'mobx-react';
import React, { useState }                      from 'react';
import * as UI                                  from 'semantic-ui-react';

//================================================================//
// ControlCommandFormBody
//================================================================//
export const ControlCommandFormBody = observer (({ controller }) => {

    console.log ( controller.type );

    switch ( controller.type ) {
        case COMMAND_TYPE.EXTEND_NETWORK:                   return ( <ExtendNetworkForm controller = { controller }/> );
        case COMMAND_TYPE.HARD_RESET:                       return ( <HardResetForm controller = { controller }/> );
        case COMMAND_TYPE.SELECT_REWARD:                    return ( <SelectRewardForm controller = { controller }/> );
        case COMMAND_TYPE.SET_MINIMUM_GRATUITY:             return ( <SetMinimumGratuityForm controller = { controller }/> );
    }
    return (
        <div/>
    );
});

//================================================================//
// ControlCommandForm
//================================================================//
export const ControlCommandForm = observer (( props ) => {

    const { controller } = props;

    if ( _.size ( controller.fields ) === 0 ) return <React.Fragment/>

    return (
        <UI.Segment>
            <UI.Form>
                <ControlCommandFormBody controller = { controller }/>
            </UI.Form>
        </UI.Segment>
    );
});
