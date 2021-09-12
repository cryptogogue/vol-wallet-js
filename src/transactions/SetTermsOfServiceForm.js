// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                              from '../fields/fields'
import { FilePickerMenuItem }                   from 'fgc';
import { observer }                             from 'mobx-react';
import React                                    from 'react';
import ReactMarkdown                            from 'react-markdown'
import * as UI                                  from 'semantic-ui-react';

//================================================================//
// SetTermsOfServiceForm
//================================================================//
export const SetTermsOfServiceForm = observer (({ controller }) => {

    const loadFile = ( text ) => {
        controller.setText ( text )
    }

    const text = controller.text;

    return (
        <React.Fragment>

             <UI.Menu fluid text>
                <FilePickerMenuItem
                    loadFile = { loadFile }
                    format = 'text'
                    accept = { '.txt, .md' }
                />
            </UI.Menu>

            <If condition = { controller.text }>
                <ReactMarkdown>
                    { controller.text }
                </ReactMarkdown>
            </If>

        </React.Fragment>
    );
});
