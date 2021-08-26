// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields 							from '../fields/fields'
import { COMMAND_TYPE }    					from './ControlCommand';
import { ControlCommandFormController }		from './ControlCommandFormController';
import _                                    from 'lodash';

//================================================================//
// SetMinimumGratuityFormController
//================================================================//
export class SetMinimumGratuityFormController extends ControlCommandFormController {

    //----------------------------------------------------------------//
    constructor ( appState ) {
        super ();

        const fieldsArray = [
            new Fields.VOLFieldController		( 'minimum',         'Minimum' ),
        ];
        this.initialize ( appState, COMMAND_TYPE.SET_MINIMUM_GRATUITY, fieldsArray );
    }
}
