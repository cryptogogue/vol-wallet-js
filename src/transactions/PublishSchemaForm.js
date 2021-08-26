// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                              from '../fields/fields'
import { observer }                             from 'mobx-react';
import React                                    from 'react';

//================================================================//
// PublishSchemaForm
//================================================================//
export const PublishSchemaForm = observer (({ controller }) => {

    return (
        <React.Fragment>
            <Fields.SchemaField     placeholder = 'Schema' field = { controller.fields.schema }/>
        </React.Fragment>
    );
});
