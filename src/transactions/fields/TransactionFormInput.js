// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

// import { Transaction, TRANSACTION_TYPE }    from './Transaction';

import { AccountKeyField }         from './AccountKeyField';
import { AssetSelectionField }     from './AssetSelectionField';
import { CryptoKeyField }          from './CryptoKeyField';
import { IntegerField }            from './IntegerField';
import { SchemaField }             from './SchemaField';
import { StringField }             from './StringField';
import { TextField }               from './TextField';
import { VOLField }                from './VOLField';

import { FIELD_CLASS }                      from './TransactionFormFieldControllers';
import * as vol                             from '../../util/vol';
import { ScannerReportMessages, SchemaScannerXLSX } from 'cardmotron';
import { assert, excel, hooks, FilePickerMenuItem, util } from 'fgc';
import JSONTree                             from 'react-json-tree';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import * as UI                              from 'semantic-ui-react';

//================================================================//
// TransactionFormInput
//================================================================//
export const TransactionFormInput = observer (( props ) => {

    const { field, controller } = props;

    switch ( field.constructor ) {

        case FIELD_CLASS.ACCOUNT_KEY:
            return (
                 <AccountKeyField
                    field       = { field }
                    controller  = { controller }
                />
            );

        case FIELD_CLASS.ASSET_SELECTION:
            return (
                 <AssetSelectionField
                    field       = { field }
                    controller  = { controller }
                />
            );

        case FIELD_CLASS.CRYPTO_KEY:
            return (
                 <CryptoKeyField
                    field       = { field }
                    controller  = { controller }
                />
            );

        case FIELD_CLASS.INTEGER:
            return (
                 <IntegerField
                    field       = { field }
                    controller  = { controller }
                />
            );

        case FIELD_CLASS.SCHEMA:
            return (
                 <SchemaField
                    field       = { field }
                    controller  = { controller }
                />
            );

        case FIELD_CLASS.STRING:
            return (
                 <StringField
                    field       = { field }
                    controller  = { controller }
                />
            );

        case FIELD_CLASS.TEXT:
            return (
                 <TextField
                    field       = { field }
                    controller  = { controller }
                />
            );

        case FIELD_CLASS.VOL:
            return (
                 <VOLField
                    field       = { field }
                    controller  = { controller }
                />
            );
    }

    return <div/>;
});
