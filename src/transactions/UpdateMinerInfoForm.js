// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { MINER_INFO_STATE }               		from './UpdateMinerInfoFormController'
import { observer }                             from 'mobx-react';
import React, { useState }                      from 'react';
import * as UI                                  from 'semantic-ui-react';
import url                                      from 'url';
import validator                                from 'validator';

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

	const [ motto, setMotto ]       = useState ( '' );
    const [ nodeURL, setNodeURL ]   = useState ( '' );
    const [ testURL, setTestURL ]   = useState ( '' );

    let onChangeMotto = ( inputMotto ) => {

        controller.clearMotto ();
        setMotto ( inputMotto );
    }

    let onCheckMotto = () => {
        controller.setMottoAsync ( motto );
    }

    let onChangeNodeURL = ( inputURL ) => {

        controller.clearMinerURL ();
        setNodeURL ( inputURL );

        if ( validator.isURL ( inputURL, { protocols: [ 'http', 'https' ], require_protocol: true, require_tld: false })) {
            inputURL = url.format ( url.parse ( inputURL ));
            setTestURL ( inputURL );
        }
    }

    let onCheckNodeURL = async () => {
        controller.setMinerURLAsync ( testURL );
    }

    const isBusy 			= controller.isBusy;
    const testMottoEnabled  =  Boolean ( motto ) && !Boolean ( controller.motto );
    const testURLEnabled    =  Boolean ( testURL ) && !Boolean ( controller.minerURL );

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
                                color = { testMottoEnabled ? 'green' : 'grey' }
                                disabled = { !testMottoEnabled }
                                onClick = { onCheckMotto }
                            />
                        </If>
                    }
                    placeholder     = "Motto"
                    name            = "motto"
                    type            = "string"
                    value           = { motto }
                    onChange        = {( event ) => { onChangeMotto ( event.target.value )}}
                />
                { controller.mottoError && <UI.Label pointing prompt>{ controller.mottoError }</UI.Label> }
            </UI.Form.Field>

            <UI.Form.Field>
                <UI.Input
                    fluid
                    loading = { isBusy }
                    action = {
                        <If condition = { !isBusy }>
                            <UI.Button
                                icon = 'sync alternate'
                                color = { testURLEnabled ? 'green' : 'grey' }
                                disabled = { !testURLEnabled }
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
                { controller.minerURLError && <UI.Label pointing prompt>{ controller.minerURLError }</UI.Label> }
            </UI.Form.Field>

            <If condition = { controller.isComplete && visage }>
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
	        </If>

        </React.Fragment>
    );
});
