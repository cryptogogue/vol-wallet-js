// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                              from '../fields/fields'
import * as vol                                 from '../util/vol';
import { AccountPolicyForm }                    from './AccountPolicyForm';
import { AffirmKeyForm }                        from './AffirmKeyForm';
import { BetaGetAssetsForm }                    from './BetaGetAssetsForm';
import { BetaGetDeckForm }                      from './BetaGetDeckForm';
import { CraftingForm }                         from './CraftingForm';
import { KeyPolicyForm }                        from './KeyPolicyForm';
import { OfferAssetsForm }                      from './OfferAssetsForm';
import { OpenAccountForm }                      from './OpenAccountForm';
import { PublishSchemaForm }                    from './PublishSchemaForm';
import { RegisterMinerForm }                    from './RegisterMinerForm';
import { RenameAccountForm }                    from './RenameAccountForm';
import { ReserveAccountNameForm }               from './ReserveAccountNameForm';
import { SendAssetsForm }                       from './SendAssetsForm';
import { SendVOLForm }                          from './SendVOLForm';
import { TRANSACTION_TYPE }                     from './Transaction';
import { UpgradeAssetsForm }                    from './UpgradeAssetsForm';
import { UpdateMinerInfoForm }                  from './UpdateMinerInfoForm';
import { assert, excel, hooks, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                             from 'mobx-react';
import React, { useState }                      from 'react';
import * as UI                                  from 'semantic-ui-react';

//================================================================//
// TransactionBalanceHeader
//================================================================//
export const TransactionBalanceHeader = observer (( props ) => {

    const { controller } = props;

    const balance           = controller.balance > 0 ? controller.balance : 0;
    const balanceColor      = balance > 0 ? 'black' : 'red';

    return (
        <React.Fragment>

            <UI.Header
                as = 'h4'
                style = {{ color: balanceColor, marginBottom: 0 }}
            >
                Balance: { vol.format ( balance )}
            </UI.Header>

            <UI.Header
                as = 'h6'
                style = {{ marginTop: 0, marginBottom: controller.suggestedGratuity ? 0 : undefined }}
            >
                Weight: { controller.weight }
            </UI.Header>

            <If condition = { controller.suggestedGratuity }>
                <UI.Header
                    as = 'h6'
                    style = {{ marginTop: 0 }}
                >
                    Suggested Gratuity: { vol.format ( controller.suggestedGratuity )}
                </UI.Header>
            </If>

        </React.Fragment>
    );
});

//================================================================//
// TransactionFormBody
//================================================================//
export const TransactionFormBody = observer (({ controller }) => {

    switch ( controller.type ) {
        case TRANSACTION_TYPE.ACCOUNT_POLICY:               return ( <AccountPolicyForm controller = { controller }/> );
        case TRANSACTION_TYPE.AFFIRM_KEY:                   return ( <AffirmKeyForm controller = { controller }/> );
        case TRANSACTION_TYPE.BETA_GET_ASSETS:              return ( <BetaGetAssetsForm controller = { controller }/> );
        case TRANSACTION_TYPE.BETA_GET_DECK:                return ( <BetaGetDeckForm controller = { controller }/> );
        case TRANSACTION_TYPE.KEY_POLICY:                   return ( <KeyPolicyForm controller = { controller }/> );
        case TRANSACTION_TYPE.OFFER_ASSETS:                 return ( <OfferAssetsForm controller = { controller }/> );
        case TRANSACTION_TYPE.OPEN_ACCOUNT:                 return ( <OpenAccountForm controller = { controller }/> );
        case TRANSACTION_TYPE.PUBLISH_SCHEMA:               return ( <PublishSchemaForm controller = { controller }/> );
        case TRANSACTION_TYPE.PUBLISH_SCHEMA_AND_RESET:     return ( <PublishSchemaForm controller = { controller }/> );
        case TRANSACTION_TYPE.REGISTER_MINER:               return ( <RegisterMinerForm controller = { controller }/> );
        case TRANSACTION_TYPE.RENAME_ACCOUNT:               return ( <RenameAccountForm controller = { controller }/> );
        case TRANSACTION_TYPE.RESERVE_ACCOUNT_NAME:         return ( <ReserveAccountNameForm controller = { controller }/> );
        case TRANSACTION_TYPE.RUN_SCRIPT:                   return ( <CraftingForm controller = { controller }/> );
        case TRANSACTION_TYPE.SEND_ASSETS:                  return ( <SendAssetsForm controller = { controller }/> );
        case TRANSACTION_TYPE.SEND_VOL:                     return ( <SendVOLForm controller = { controller }/> );
        case TRANSACTION_TYPE.UPGRADE_ASSETS:               return ( <UpgradeAssetsForm controller = { controller }/> );
        case TRANSACTION_TYPE.UPDATE_MINER_INFO:            return ( <UpdateMinerInfoForm controller = { controller }/> );
    }
    return (
        <div/>
    );
});

//================================================================//
// TransactionForm
//================================================================//
export const TransactionForm = observer (( props ) => {

    const { controller } = props;

    return (
        <UI.Segment>
            <If condition = { !controller.standalone }>
                <TransactionBalanceHeader controller = { controller }/>
            </If>
            <UI.Form>
                <fieldset style = {{ border: 0, margin: 0, padding: 0 }} disabled = { props.disabled }>
                    <TransactionFormBody controller = { controller }/>
                    <Fields.VOLField field = { controller.fields.gratuity }/>

                    <If condition = { controller.standalone }>
                        <Fields.VOLField field = { controller.fields.profitShare }/>
                        <Fields.VOLField field = { controller.fields.transferTax }/>
                    </If>

                    <If condition = { !controller.standalone }>
                        <Fields.AccountKeyField field = { controller.fields.makerKeyName } disabled = { props.disabled }/>
                    </If>
                </fieldset>
            </UI.Form>
        </UI.Segment>
    );
});
