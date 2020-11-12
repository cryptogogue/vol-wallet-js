// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { Transaction, TRANSACTION_TYPE }                    from './Transaction';
import { AccountPolicyFormController }                      from './AccountPolicyFormController';
import { AffirmKeyFormController }                          from './AffirmKeyFormController';
import { BetaGetAssetsFormController }                      from './BetaGetAssetsFormController';
import { BetaGetDeckFormController }                        from './BetaGetDeckFormController';
import { KeyPolicyFormController }                          from './KeyPolicyFormController';
import { OpenAccountFormController }                        from './OpenAccountFormController';
import { PublishSchemaFormController }                      from './PublishSchemaFormController';
import { RegisterMinerFormController }                      from './RegisterMinerFormController';
import { RenameAccountFormController }                      from './RenameAccountFormController';
import { ReserveAccountNameFormController }                 from './ReserveAccountNameFormController';
import { SendVOLFormController }                            from './SendVOLFormController';
import { assert, hooks, util }                              from 'fgc';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                                         from 'mobx-react';
import React, { useState }                                  from 'react';
import * as UI                                              from 'semantic-ui-react';

//----------------------------------------------------------------//
export const gTransactionTypes = [
    TRANSACTION_TYPE.SEND_VOL,
    TRANSACTION_TYPE.OPEN_ACCOUNT,
    // TRANSACTION_TYPE.ACCOUNT_POLICY,
    TRANSACTION_TYPE.BETA_GET_ASSETS,
    TRANSACTION_TYPE.BETA_GET_DECK,
    // TRANSACTION_TYPE.KEY_POLICY,
    
    TRANSACTION_TYPE.PUBLISH_SCHEMA,
    TRANSACTION_TYPE.PUBLISH_SCHEMA_AND_RESET,
    TRANSACTION_TYPE.REGISTER_MINER,
    TRANSACTION_TYPE.RENAME_ACCOUNT,
    TRANSACTION_TYPE.RESERVE_ACCOUNT_NAME,
];

//----------------------------------------------------------------//
function makeControllerForTransactionType ( appState, transactionType ) {

    switch ( transactionType ) {
        case TRANSACTION_TYPE.ACCOUNT_POLICY:               return new AccountPolicyFormController ( appState );
        case TRANSACTION_TYPE.AFFIRM_KEY:                   return new AffirmKeyFormController ( appState );
        case TRANSACTION_TYPE.BETA_GET_ASSETS:              return new BetaGetAssetsFormController ( appState );
        case TRANSACTION_TYPE.BETA_GET_DECK:                return new BetaGetDeckFormController ( appState );
        case TRANSACTION_TYPE.KEY_POLICY:                   return new KeyPolicyFormController ( appState );
        case TRANSACTION_TYPE.OPEN_ACCOUNT:                 return new OpenAccountFormController ( appState );
        case TRANSACTION_TYPE.PUBLISH_SCHEMA:               return new PublishSchemaFormController ( appState );
        case TRANSACTION_TYPE.PUBLISH_SCHEMA_AND_RESET:     return new PublishSchemaFormController ( appState, true );
        case TRANSACTION_TYPE.REGISTER_MINER:               return new RegisterMinerFormController ( appState );
        case TRANSACTION_TYPE.RENAME_ACCOUNT:               return new RenameAccountFormController ( appState );
        case TRANSACTION_TYPE.RESERVE_ACCOUNT_NAME:         return new ReserveAccountNameFormController ( appState );
        case TRANSACTION_TYPE.SEND_VOL:                     return new SendVOLFormController ( appState );
    }
    return new TransactionFormController ( appState );
}

//================================================================//
// TransactionDropdown
//================================================================//
export const TransactionDropdown = observer (( props ) => {

    const { appState, controller, setController } = props;

    const onSelection = ( transactionType ) => {
        if ( !controller || ( controller.type !== transactionType )) {
            setController ( makeControllerForTransactionType ( appState, transactionType ));
        }
    }

    let options = [];
    const disabledOptions = [];

    for ( let typeID in gTransactionTypes ) {
        const transactionType = gTransactionTypes [ typeID ];
        if ( controller && ( controller.type === transactionType )) continue;

        const disabled = !appState.checkTransactionEntitlements ( transactionType );

        const item = (
            <UI.Dropdown.Item
                key         = { transactionType }
                text        = { Transaction.friendlyNameForType ( transactionType )}
                onClick     = {() => { onSelection ( transactionType )}}
                disabled    = { disabled }
            />
        );

        if ( disabled ) {
            disabledOptions.push ( item );
        }
        else {
            options.push ( item );
        }
    }
    options = options.concat ( disabledOptions );

    return (
        <UI.Menu>
            <UI.Dropdown
                fluid
                search
                item
                placeholder     = 'Create Transaction'
                text            = { controller ? controller.friendlyName : '' }
                disabled        = { props.disabled }
            >
                <UI.Dropdown.Menu>
                    { options }
                </UI.Dropdown.Menu>
            </UI.Dropdown>
        </UI.Menu>
    );
});
