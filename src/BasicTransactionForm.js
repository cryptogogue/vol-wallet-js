// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { Transaction, TRANSACTION_TYPE }    from './Transaction';
import { TransactionFormInput }             from './TransactionFormInput';
import { assert, excel, hooks, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import * as UI                              from 'semantic-ui-react';

//================================================================//
// TransactionBalanceHeader
//================================================================//
export const TransactionBalanceHeader = observer (( props ) => {

    const { controller } = props;

    const balance       = controller.balance > 0 ? controller.balance : 0;
    const textColor     = balance > 0 ? 'black' : 'red';

    return (
        <UI.Header
            as = 'h4'
            style = {{ color: textColor }}
        >
            Balance: { balance }
        </UI.Header>
    );
});

//================================================================//
// TransactionFormFields
//================================================================//
export const TransactionFormFields = observer (( props ) => {

    const { controller } = props;

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

    return (
        <React.Fragment>
            { fields }
        </React.Fragment>
    );
});

//================================================================//
// BasicTransactionForm
//================================================================//
export const BasicTransactionForm = observer (( props ) => {

    const { controller } = props;

    return (
        <UI.Segment>
            <TransactionBalanceHeader controller = { controller }/>
            <UI.Form>    
                <TransactionFormFields controller = { controller }/>
            </UI.Form>
        </UI.Segment>
    );
});
