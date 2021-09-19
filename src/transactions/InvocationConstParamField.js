// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { CraftingAssetSelectionModal }          from './CraftingAssetSelectionModal';
import { InvocationConstImageParamField }       from './InvocationConstImageParamField';
import { InvocationConstNumericParamField }     from './InvocationConstNumericParamField';
import { InvocationConstStringParamField }      from './InvocationConstStringParamField';
import { InvocationConstTextParamField }        from './InvocationConstTextParamField';
import { InvocationConstVOLParamField }         from './InvocationConstVOLParamField';
import * as vol                                 from '../util/vol';
import CryptoJS                                 from 'crypto-js';
import { observer }                             from 'mobx-react';
import React, { useState }                      from 'react';
import * as UI                                  from 'semantic-ui-react';

//================================================================//
// InvocationConstParamField
//================================================================//
export const InvocationConstParamField = observer (( props ) => {

    const inputSchemeType = props.invocation.method.constArgs [ props.paramName ].inputScheme.type;

    switch ( inputSchemeType ) {
        case 'decimal':             return <InvocationConstNumericParamField { ...props }/>;
        case 'image':               return <InvocationConstImageParamField { ...props }/>;
        case 'integer':             return <InvocationConstNumericParamField isInt { ...props }/>;
        case 'string':              return <InvocationConstStringParamField { ...props }/>;
        case 'text':                return <InvocationConstTextParamField { ...props }/>;
        case 'vol':                 return <InvocationConstVOLParamField { ...props }/>;
    }
});
