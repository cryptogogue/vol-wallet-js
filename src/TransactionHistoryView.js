// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { PagingMenu, PagingController } from './PagingMenu';
import { Transaction,TX_STATUS, TRANSACTION_TYPE } from './transactions/Transaction';
import * as vol             from './util/vol';
import _                    from 'lodash';
import JSONTree             from 'react-json-tree';
import React, { useState }  from 'react';
import { assert, hooks, InfiniteScrollView, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }         from 'mobx-react';
import * as UI              from 'semantic-ui-react';

//----------------------------------------------------------------//
function getExplanation ( accountService, tx ) {

    const isMaker = accountService.index === tx.makerIndex;

    switch ( tx.type ) {

        case TRANSACTION_TYPE.BUY_ASSETS: {

            const amount = vol.format ( tx.body.price );

            if ( isMaker ) return `You bought some assets for ${ amount }.`;
            return `You sold some assets for ${ amount }.`;
        }
        case TRANSACTION_TYPE.SEND_ASSETS: {

            const accountName = tx.body.accountName;
            const amount = tx.body.assetIdentifiers.length;

            if ( isMaker ) return `You sent ${ accountName } ${ amount } assets.`;
            return `${ accountName } sent you ${ amount } assets.`;
        }
        case TRANSACTION_TYPE.SEND_VOL: {

            const accountName = tx.body.accountName;
            const amount = vol.format ( tx.body.amount );

            if ( isMaker ) return `You sent ${ accountName } ${ amount } VOL.`;
            return `${ accountName } sent you ${ amount } VOL.`;
        }
    }
    return '--';
}

//================================================================//
// Filter
//================================================================//
class Filter {

    //----------------------------------------------------------------//
    constructor ( transactions ) {

        this.unfiltered = transactions;
    }

    //----------------------------------------------------------------//
    finalize () {
    }

    //----------------------------------------------------------------//
    @computed get
    transactions () {

        const transactions = [];
        for ( let transaction of this.unfiltered ) {

            switch ( transaction.type ) {
                case TRANSACTION_TYPE.BUY_ASSETS:
                case TRANSACTION_TYPE.SEND_ASSETS:
                case TRANSACTION_TYPE.SEND_VOL:
                    transactions.push ( transaction );
                    break;
            }
        }
        return transactions;
    }
};

//================================================================//
// TransactionHistoryView
//================================================================//
export const TransactionHistoryView = observer (( props ) => {
    
    const accountService        = props.accountService;
    const filter                = hooks.useFinalizable (() => new Filter ( props.transactions ));
    const pagingController      = hooks.useFinalizable (() => new PagingController ( filter.transactions.length ));

    const transactions          = filter.transactions;

    let transactionList = [];
    for ( let i = pagingController.pageItemMin; i < pagingController.pageItemMax; ++i ) {

        const transaction = transactions [ transactions.length - i - 1 ];
        let friendlyName = Transaction.friendlyNameForType ( transaction.type );

        transactionList.push (
            <UI.Table.Row key = { i }>
                <UI.Table.Cell>{ getExplanation ( accountService, transaction )}</UI.Table.Cell>
            </UI.Table.Row>
        );
    }

    return (
        <UI.Table unstackable>
            
            <UI.Table.Header>
                <UI.Table.Row>
                    <UI.Table.HeaderCell>Note</UI.Table.HeaderCell>
                </UI.Table.Row>
            </UI.Table.Header>

            <UI.Table.Body>
                { transactionList }
            </UI.Table.Body>

            <If condition = { pagingController.pageCount > 1 }>
                <UI.Table.Footer>
                    <UI.Table.Row>
                        <UI.Table.HeaderCell colSpan = '6'>
                            <PagingMenu controller = { pagingController }/>
                    </UI.Table.HeaderCell>
                    </UI.Table.Row>
                </UI.Table.Footer>
            </If>

        </UI.Table>
    );
});
