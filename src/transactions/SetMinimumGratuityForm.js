// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields 							from './fields/transaction-fields'
import { Transaction, TRANSACTION_TYPE }    from './Transaction';
import { TransactionFormController }        from './TransactionFormController';
import { assert, randomBytes, util }        from 'fgc';
import _                                    from 'lodash';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';

//================================================================//
// SetMinimumGratuityForm
//================================================================//
export const SetMinimumGratuityForm = observer (({ controller }) => {

    return (
        <BasicTransactionForm controller = { controller }/>
    );
});
