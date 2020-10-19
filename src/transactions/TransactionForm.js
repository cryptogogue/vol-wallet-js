// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                              from './fields/transaction-fields'
import { AccountPolicyForm }                    from './AccountPolicyForm';
import { AffirmKeyForm }                        from './AffirmKeyForm';
import { BasicTransactionForm }                 from './BasicTransactionForm';
import { BetaGetAssetsForm }                    from './BetaGetAssetsForm';
import { BetaGetDeckForm }                      from './BetaGetDeckForm';
import { CraftingForm }                         from './CraftingForm';
import { KeyPolicyForm }                        from './KeyPolicyForm';
import { OpenAccountForm }                      from './OpenAccountForm';
import { PublishSchemaForm }                    from './PublishSchemaForm';
import { RegisterMinerForm }                    from './RegisterMinerForm';
import { RenameAccountForm }                    from './RenameAccountForm';
import { ReserveAccountNameForm }               from './ReserveAccountNameForm';
import { SelectRewardForm }                     from './SelectRewardForm';
import { SendAssetsForm }                       from './SendAssetsForm';
import { SendVOLForm }                          from './SendVOLForm';
import { SetMinimumGratuityForm }               from './SetMinimumGratuityForm';
import { UpgradeAssetsForm }                    from './UpgradeAssetsForm';
import { TRANSACTION_TYPE }                     from './Transaction';
import { assert, excel, hooks, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                             from 'mobx-react';
import React, { useState }                      from 'react';
import * as UI                                  from 'semantic-ui-react';

//================================================================//
// TransactionForm
//================================================================//
export const TransactionForm = observer (({ controller }) => {

    switch ( controller.type ) {
        case TRANSACTION_TYPE.ACCOUNT_POLICY:               return ( <AccountPolicyForm controller = { controller }/> );
        case TRANSACTION_TYPE.AFFIRM_KEY:                   return ( <AffirmKeyForm controller = { controller }/> );
        case TRANSACTION_TYPE.BETA_GET_ASSETS:              return ( <BetaGetAssetsForm controller = { controller }/> );
        case TRANSACTION_TYPE.BETA_GET_DECK:                return ( <BetaGetDeckForm controller = { controller }/> );
        case TRANSACTION_TYPE.KEY_POLICY:                   return ( <KeyPolicyForm controller = { controller }/> );
        case TRANSACTION_TYPE.OPEN_ACCOUNT:                 return ( <OpenAccountForm controller = { controller }/> );
        case TRANSACTION_TYPE.PUBLISH_SCHEMA:               return ( <PublishSchemaForm controller = { controller }/> );
        case TRANSACTION_TYPE.PUBLISH_SCHEMA_AND_RESET:     return ( <PublishSchemaForm controller = { controller }/> );
        case TRANSACTION_TYPE.REGISTER_MINER:               return ( <RegisterMinerForm controller = { controller }/> );
        case TRANSACTION_TYPE.RENAME_ACCOUNT:               return ( <RenameAccountForm controller = { controller }/> );
        case TRANSACTION_TYPE.RESERVE_ACCOUNT_NAME:         return ( <ReserveAccountNameForm controller = { controller }/> );
        case TRANSACTION_TYPE.RUN_SCRIPT:                   return ( <CraftingForm controller = { controller }/> );
        case TRANSACTION_TYPE.SELECT_REWARD:                return ( <SelectRewardForm controller = { controller }/> );
        case TRANSACTION_TYPE.SEND_ASSETS:                  return ( <SendAssetsForm controller = { controller }/> );
        case TRANSACTION_TYPE.SEND_VOL:                     return ( <SendVOLForm controller = { controller }/> );
        case TRANSACTION_TYPE.SET_MINIMUM_GRATUITY:         return ( <SetMinimumGratuityForm controller = { controller }/> );
        case TRANSACTION_TYPE.UPGRADE_ASSETS:               return ( <UpgradeAssetsForm controller = { controller }/> );
    }
    return (
        <div/>
    );
});
