// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields 							from '../fields/fields'
import { COMMAND_TYPE }    					from './ControlCommand';
import { ControlCommandFormController }		from './ControlCommandFormController';
import { assert, randomBytes, util }        from 'fgc';
import _                                    from 'lodash';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';

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
