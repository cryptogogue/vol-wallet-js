// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { Transaction, TRANSACTION_TYPE }            from './Transaction';
import { TransactionFormController_AccountPolicy }  from './TransactionFormController_AccountPolicy';
import { TransactionFormController_AffirmKey }      from './TransactionFormController_AffirmKey';
import { TransactionFormController_BetaGetAssets }  from './TransactionFormController_BetaGetAssets';
import { TransactionFormController_KeyPolicy }      from './TransactionFormController_KeyPolicy';
import { TransactionFormController_OpenAccount }    from './TransactionFormController_OpenAccount';
import { TransactionFormController_PublishSchema }  from './TransactionFormController_PublishSchema';
import { TransactionFormController_RegisterMiner }  from './TransactionFormController_RegisterMiner';
import { TransactionFormController_RenameAccount }  from './TransactionFormController_RenameAccount';
import { TransactionFormController_SendVOL }        from './TransactionFormController_SendVOL';
import { assert, hooks, util }                      from 'fgc';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                                 from 'mobx-react';
import React, { useState }                          from 'react';
import * as UI                                      from 'semantic-ui-react';

//----------------------------------------------------------------//
export const gTransactionTypes = [
    TRANSACTION_TYPE.SEND_VOL,
    // TRANSACTION_TYPE.ACCOUNT_POLICY,
    TRANSACTION_TYPE.BETA_GET_ASSETS,
    // TRANSACTION_TYPE.KEY_POLICY,
    TRANSACTION_TYPE.OPEN_ACCOUNT,
    TRANSACTION_TYPE.PUBLISH_SCHEMA,
    // TRANSACTION_TYPE.REGISTER_MINER,
    TRANSACTION_TYPE.RENAME_ACCOUNT,
];

//----------------------------------------------------------------//
function makeControllerForTransactionType ( appState, transactionType ) {

    switch ( transactionType ) {
        case TRANSACTION_TYPE.ACCOUNT_POLICY:   return new TransactionFormController_AccountPolicy ( appState );
        case TRANSACTION_TYPE.AFFIRM_KEY:       return new TransactionFormController_AffirmKey ( appState );
        case TRANSACTION_TYPE.BETA_GET_ASSETS:  return new TransactionFormController_BetaGetAssets ( appState );
        case TRANSACTION_TYPE.KEY_POLICY:       return new TransactionFormController_KeyPolicy ( appState );
        case TRANSACTION_TYPE.OPEN_ACCOUNT:     return new TransactionFormController_OpenAccount ( appState );
        case TRANSACTION_TYPE.PUBLISH_SCHEMA:   return new TransactionFormController_PublishSchema ( appState );
        case TRANSACTION_TYPE.REGISTER_MINER:   return new TransactionFormController_RegisterMiner ( appState );
        case TRANSACTION_TYPE.RENAME_ACCOUNT:   return new TransactionFormController_RenameAccount ( appState );
        case TRANSACTION_TYPE.SEND_VOL:         return new TransactionFormController_SendVOL ( appState );
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
            >
                <UI.Dropdown.Menu>
                    { options }
                </UI.Dropdown.Menu>
            </UI.Dropdown>
        </UI.Menu>
    );
});
