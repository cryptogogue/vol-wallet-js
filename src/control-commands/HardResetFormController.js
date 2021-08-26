// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { COMMAND_TYPE }    					from './ControlCommand';
import { ControlCommandFormController }		from './ControlCommandFormController';
import _                                    from 'lodash';

//================================================================//
// HardResetFormController
//================================================================//
export class HardResetFormController extends ControlCommandFormController {

    //----------------------------------------------------------------//
    constructor ( appState ) {
        super ();

        this.initialize ( appState, COMMAND_TYPE.HARD_RESET );
    }
}
