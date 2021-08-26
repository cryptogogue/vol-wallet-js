// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                              from '../fields/fields'
import { observer }                             from 'mobx-react';
import React                                    from 'react';

//================================================================//
// BetaGetDeckForm
//================================================================//
export const BetaGetDeckForm = observer (({ controller }) => {

    return (
        <React.Fragment>
            <Fields.StringField     placeholder = 'Deck Name' field = { controller.fields.deckName }/>
        </React.Fragment>
    );
});
