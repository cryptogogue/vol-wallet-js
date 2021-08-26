// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields 							from '../fields/fields'
import { COMMAND_TYPE }    					from './ControlCommand';
import { ControlCommandFormController }		from './ControlCommandFormController';
import _                                    from 'lodash';

//================================================================//
// SelectRewardFormController
//================================================================//
export class SelectRewardFormController extends ControlCommandFormController {

    //----------------------------------------------------------------//
    constructor ( appState ) {
        super ();

        const fieldsArray = [
            new Fields.StringFieldController	( 'reward', 'Reward', '' ),
        ];
        this.initialize ( appState, COMMAND_TYPE.SELECT_REWARD, fieldsArray );
    }
}
