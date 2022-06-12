// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { Transaction, TRANSACTION_TYPE }                    from './Transaction';
import { AccountPolicyFormController }                      from './AccountPolicyFormController';
import { AffirmKeyFormController }                          from './AffirmKeyFormController';
import { BetaGetAssetsFormController }                      from './BetaGetAssetsFormController';
import { BetaGetDeckFormController }                        from './BetaGetDeckFormController';
import { IdentifyAccountFormController }                    from './IdentifyAccountFormController';
import { KeyPolicyFormController }                          from './KeyPolicyFormController';
import { OpenAccountFormController }                        from './OpenAccountFormController';
import { PublishSchemaFormController }                      from './PublishSchemaFormController';
import { RegisterMinerFormController }                      from './RegisterMinerFormController';
import { RenameAccountFormController }                      from './RenameAccountFormController';
import { ReserveAccountNameFormController }                 from './ReserveAccountNameFormController';
import { SendVOLFormController }                            from './SendVOLFormController';
import { SetIdentityKeyFormController }                     from './SetIdentityKeyFormController';
import { SetTermsOfServiceFormController }                  from './SetTermsOfServiceFormController';
import { UpdateMinerInfoFormController }                    from './UpdateMinerInfoFormController';
import { observer }                                         from 'mobx-react';
import React                                                from 'react';
import * as UI                                              from 'semantic-ui-react';

//----------------------------------------------------------------//
export const ACCOUNT_TRANSACTIONS_MENU = [
    TRANSACTION_TYPE.SEND_VOL,
    TRANSACTION_TYPE.OPEN_ACCOUNT,
    TRANSACTION_TYPE.IDENTIFY_ACCOUNT,

    // TRANSACTION_TYPE.ACCOUNT_POLICY,
    TRANSACTION_TYPE.BETA_GET_ASSETS,
    TRANSACTION_TYPE.BETA_GET_DECK,
    // TRANSACTION_TYPE.KEY_POLICY,
    
    TRANSACTION_TYPE.PUBLISH_SCHEMA,
    TRANSACTION_TYPE.PUBLISH_SCHEMA_AND_RESET,
    TRANSACTION_TYPE.REGISTER_MINER,
    TRANSACTION_TYPE.RENAME_ACCOUNT,
    TRANSACTION_TYPE.RESERVE_ACCOUNT_NAME,
    TRANSACTION_TYPE.SET_IDENTITY_KEY,
    TRANSACTION_TYPE.SET_TERMS_OF_SERVICE,
];

//----------------------------------------------------------------//
export const MINER_TRANSACTIONS_MENU = [
    TRANSACTION_TYPE.UPDATE_MINER_INFO,
];

//----------------------------------------------------------------//
function makeControllerForTransactionType ( accountService, transactionType ) {

    switch ( transactionType ) {
        case TRANSACTION_TYPE.ACCOUNT_POLICY:               return new AccountPolicyFormController ( accountService );
        case TRANSACTION_TYPE.AFFIRM_KEY:                   return new AffirmKeyFormController ( accountService );
        case TRANSACTION_TYPE.BETA_GET_ASSETS:              return new BetaGetAssetsFormController ( accountService );
        case TRANSACTION_TYPE.BETA_GET_DECK:                return new BetaGetDeckFormController ( accountService );
        case TRANSACTION_TYPE.IDENTIFY_ACCOUNT:             return new IdentifyAccountFormController ( accountService );
        case TRANSACTION_TYPE.KEY_POLICY:                   return new KeyPolicyFormController ( accountService );
        case TRANSACTION_TYPE.OPEN_ACCOUNT:                 return new OpenAccountFormController ( accountService );
        case TRANSACTION_TYPE.PUBLISH_SCHEMA:               return new PublishSchemaFormController ( accountService );
        case TRANSACTION_TYPE.PUBLISH_SCHEMA_AND_RESET:     return new PublishSchemaFormController ( accountService, true );
        case TRANSACTION_TYPE.REGISTER_MINER:               return new RegisterMinerFormController ( accountService );
        case TRANSACTION_TYPE.RENAME_ACCOUNT:               return new RenameAccountFormController ( accountService );
        case TRANSACTION_TYPE.RESERVE_ACCOUNT_NAME:         return new ReserveAccountNameFormController ( accountService );
        case TRANSACTION_TYPE.SEND_VOL:                     return new SendVOLFormController ( accountService );
        case TRANSACTION_TYPE.SET_IDENTITY_KEY:             return new SetIdentityKeyFormController ( accountService );
        case TRANSACTION_TYPE.SET_TERMS_OF_SERVICE:         return new SetTermsOfServiceFormController ( accountService );
        case TRANSACTION_TYPE.UPDATE_MINER_INFO:            return new UpdateMinerInfoFormController ( accountService );
    }
    return new TransactionFormController ( accountService );
}

//================================================================//
// TransactionDropdown
//================================================================//
export const TransactionDropdown = observer (( props ) => {

    const { accountService, controller, setController } = props;

    const menu = props.menu || ACCOUNT_TRANSACTIONS_MENU;

    const onSelection = ( transactionType ) => {
        if ( !controller || ( controller.type !== transactionType )) {
            setController ( makeControllerForTransactionType ( accountService, transactionType ));
        }
    }

    let options = [];

    for ( let transactionType of menu ) {

        if ( controller && ( controller.type === transactionType )) continue;
        if ( !accountService.checkTransactionEntitlements ( transactionType )) continue;

        const item = (
            <UI.Dropdown.Item
                key         = { transactionType }
                text        = { Transaction.friendlyNameForType ( transactionType )}
                onClick     = {() => { onSelection ( transactionType )}}
            />
        );
        options.push ( item );
    }

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
