// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                              from '../fields/fields'
import { MINER_INFO_STATE }               		from './RegisterMinerFormController'
import { assert, excel, hooks, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                             from 'mobx-react';
import React, { useState }                      from 'react';
import * as UI                                  from 'semantic-ui-react';
import validator                    			from 'validator';

//================================================================//
// RegisterMinerForm
//================================================================//
export const RegisterMinerForm = observer (({ controller }) => {

	const [ nodeURL, setNodeURL ]               = useState ( '' );
    const [ testURL, setTestURL ]               = useState ( '' );

    let onChangeNodeURL = ( url ) => {

        controller.reset ();
        setNodeURL ( url );

        if ( validator.isURL ( url, { protocols: [ 'http', 'https' ], require_protocol: true, require_tld: false })) {
            url = url.replace ( /\/+$/, '' );
            setTestURL ( url );
        }
    }

    let onCheckNodeURL = () => {
        controller.fetchNodeInfo ( testURL );
    }

    const isBusy 			= controller.state === MINER_INFO_STATE.BUSY;
    const nodeURLError 		= controller.state === MINER_INFO_STATE.ERROR && 'Error fetching node info.';
    const testEnabled 		= Boolean ( testURL );

    return (
        <React.Fragment>
        	<UI.Form.Field>
                <UI.Input
                    fluid
                    loading = { isBusy }
                    action = {
                        <If condition = { !isBusy }>
                            <UI.Button
                                icon = 'sync alternate'
                                color = { testEnabled ? 'green' : 'grey' }
                                disabled = { !testEnabled }
                                onClick = { onCheckNodeURL }
                            />
                        </If>
                    }
                    placeholder     = "Node URL"
                    name            = "nodeURL"
                    type            = "url"
                    value           = { nodeURL }
                    onChange        = {( event ) => { onChangeNodeURL ( event.target.value )}}
                />
                { nodeURLError && <UI.Label pointing prompt>{ nodeURLError }</UI.Label> }
            </UI.Form.Field>


            <If condition = { controller.isComplete }>

	            <Choose>

	                <When condition = { controller.isErrorFree }>
	                    <UI.Message
	                        positive
	                        icon = 'sitemap'
	                        header = { controller.minerID }
	                        content = 'Found a mining node.'
	                    />
	                </When>

	                <Otherwise>
	                    <UI.Message
	                        negative
	                        icon = 'question circle'
	                        header = 'Not found.'
	                        content = 'Not a mining node.'
	                    />
	                </Otherwise>

	            </Choose>
	        </If>

        </React.Fragment>
    );
});
