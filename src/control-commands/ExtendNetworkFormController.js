// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields 							from '../fields/fields'
import { COMMAND_TYPE }    					from './ControlCommand';
import { ControlCommandFormController }		from './ControlCommandFormController';
import _                                    from 'lodash';

//================================================================//
// ExtendNetworkFormController
//================================================================//
export class ExtendNetworkFormController extends ControlCommandFormController {

    //----------------------------------------------------------------//
    constructor ( appState ) {
        super ();

        const fieldsArray = [
            new Fields.StringFieldController	( 'url', 'Url', '' ),
        ];
        this.initialize ( appState, COMMAND_TYPE.EXTEND_NETWORK, fieldsArray );
    }
}
