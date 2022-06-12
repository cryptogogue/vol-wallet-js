// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                              from '../fields/fields'
import { FilePickerMenuItem }                   from 'fgc';
import { observer }                             from 'mobx-react';
import React                                    from 'react';
import JSONTree                                 from 'react-json-tree';
import * as UI                                  from 'semantic-ui-react';

//================================================================//
// IdentifyAccountForm
//================================================================//
export const IdentifyAccountForm = observer (({ controller }) => {

    const loadFile = ( text ) => {
        controller.setGamercert ( text )
    }

    const gamercert = controller.gamercert;

    return (
        <React.Fragment>

             <UI.Menu fluid text>
                <FilePickerMenuItem
                    loadFile            = { loadFile }
                    format              = 'text'
                    accept              = { '.json' }
                />
            </UI.Menu>

            <If condition = { controller.gamercert }>
                <UI.Form.Field>
                    <JSONTree
                        hideRoot
                        sortObjectKeys
                        data                = { JSON.parse ( controller.gamercert )}
                        theme               = 'bright'
                        shouldExpandNode    = {() => { return true; }}
                    />
                </UI.Form.Field>
            </If>

        </React.Fragment>
    );
});
