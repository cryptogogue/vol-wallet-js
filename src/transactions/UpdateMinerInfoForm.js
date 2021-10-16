// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { MINER_INFO_STATE }               		from './UpdateMinerInfoFormController'
import { observer }                             from 'mobx-react';
import React, { useState }                      from 'react';
import * as UI                                  from 'semantic-ui-react';

const COMPLIMENTS = [
    'You have a lovely visage!',                        // 0
    'This visage is a born winner!',                    // 1
    'A most auspicious visage!',                        // 2
    'A visage of inestimable beauty!',                  // 3
    'An unusually lucky visage!',                       // 4
    'No visage could be more charming!',                // 5
    'This visage will be the envy of all!',             // 6
    'A visage sure to bring you fame and fortune!',     // 7
    'Success with this visage is all but guaranteed!',  // 8
    'A clever motto makes a charming visage!',          // 9
    'The best visage yet!',                             // a
    'This visage will outshine all others!',            // b
    'Surely an unbeatable visage!',                     // c
    'A rare and glorious visage!',                      // d
    'With this visage, fortune will rain upon you!',    // e
    'Riches await you with a visage such as this!',     // f
];

//----------------------------------------------------------------//
function chooseCompliment ( visage ) {
    const firstChar = visage.charAt ( 0 );
    const index = parseInt ( firstChar, 16 );
    return COMPLIMENTS [ index ];
}

//================================================================//
// UpdateMinerInfoForm
//================================================================//
export const UpdateMinerInfoForm = observer (({ controller }) => {

	const [ motto, setMotto ]          = useState ( '' );

    let onCheckMotto = () => {
        controller.setMottoAsync ( motto );
    }

    const isBusy 			= controller.state === MINER_INFO_STATE.BUSY;
    const nodeURLError 		= controller.state === MINER_INFO_STATE.ERROR && 'Error fetching node info.';
    const testEnabled 		= Boolean ( motto );

    const visage            = controller.visage ? controller.visage.signature : false;

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
                                onClick = { onCheckMotto }
                            />
                        </If>
                    }
                    placeholder     = "Motto"
                    name            = "motto"
                    type            = "string"
                    value           = { motto }
                    onChange        = {( event ) => { setMotto ( event.target.value )}}
                />
                { nodeURLError && <UI.Label pointing prompt>{ nodeURLError }</UI.Label> }
            </UI.Form.Field>

            <If condition = { controller.isComplete }>

	            <Choose>

	                <When condition = { visage }>
                        <UI.Segment>
                            <UI.Header as='h4'>{ chooseCompliment ( visage )}</UI.Header>
                            <UI.Segment
                                raised
                                style = {{
                                    wordBreak: 'break-all',
                                    wordWrap: 'break-word',
                                    overflowWrap: 'break-word',
                                    fontFamily: 'monospace',
                                }}
                            >
                                { visage }
                            </UI.Segment>
                        </UI.Segment>
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
