// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { Transaction, TRANSACTION_TYPE }    from './Transaction';
import { TransactionFormInput }             from './TransactionFormInput';
import { assert, excel, hooks, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import * as UI                              from 'semantic-ui-react';

//================================================================//
// TransactionForm
//================================================================//
export const TransactionForm = observer (( props ) => {

    const { controller } = props;

    const onChange = () => {
        controller.validate ();
    }

    // add the fields in order
    let fields = [];
    for ( let field of controller.fieldsArray ) {
        fields.push (
            <TransactionFormInput
                key             = { field.fieldName }
                field           = { field }
                controller      = { controller }
            />
        );
    }

    const balance       = controller.balance > 0 ? controller.balance : 0;
    const textColor     = balance > 0 ? 'black' : 'red';

    return (
        <UI.Segment>
            <UI.Header
                as = 'h4'
                style = {{ color: textColor }}
            >
                Balance: { balance }
            </UI.Header>
            <UI.Form>    
                { fields }
            </UI.Form>
        </UI.Segment>
    );
});
