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
function formatAssetList ( assets ) {

    if ( !assets.length ) return 'no assets';

    if ( assets.length === 1 ) {
        return `an asset (${ assets [ 0 ].assetID })`;
    }

    const assetIDs = [];
    for ( let asset of assets ) {
        assetIDs.push ( asset.assetID );
    }

    return `${ assets.length } assets (${ assetIDs.join ( ', ' )})`;
}

//----------------------------------------------------------------//
function getExplanation ( accountService, tx ) {

    const isMaker = accountService.index === tx.makerIndex;

    switch ( tx.type ) {

        case TRANSACTION_TYPE.BUY_ASSETS: {

            const price = vol.format ( tx.body.price );
            const assetList = formatAssetList ( tx.details.assets );

            if ( isMaker ) return `You bought ${ assetList } from ${ tx.details.from } for ${ price }.`;
            return `You sold ${ assetList } to ${ tx.details.to } for ${ price }.`;
        }
        case TRANSACTION_TYPE.SEND_ASSETS: {

            const accountName = tx.body.accountName;
            const assetList = formatAssetList ( tx.details.assets );

            if ( isMaker ) return `You sent ${ assetList } to ${ accountName }.`;
            return `${ accountName } sent you ${ assetList }.`;
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
    @computed get
    filtered () {

        let index = 0;
        const filtered = [];
        for ( let transaction of this.unfiltered ) {

            switch ( transaction.type ) {
                case TRANSACTION_TYPE.BUY_ASSETS:
                case TRANSACTION_TYPE.SEND_ASSETS:
                case TRANSACTION_TYPE.SEND_VOL: {
                    filtered.push ( index );
                    break;
                }
            }
            index++;
        }
        return filtered;
    }

    //----------------------------------------------------------------//
    finalize () {
    }
};

//================================================================//
// TransactionHistoryView
//================================================================//
export const TransactionHistoryView = observer (( props ) => {
    
    const accountService        = props.accountService;
    const filter                = hooks.useFinalizable (() => new Filter ( props.transactions ));
    const pagingController      = hooks.useFinalizable (() => new PagingController ( filter.filtered.length ));

    const filtered              = filter.filtered;
    const transactions          = props.transactions;

    let transactionList = [];
    for ( let i = pagingController.pageItemMin; i < pagingController.pageItemMax; ++i ) {

        const index = filtered [ filtered.length - i - 1 ];
        const transaction = transactions [ index ];
        const isUnread = (( accountService.index !== transaction.makerIndex ) && ( index >= accountService.inboxRead ));

        transactionList.push (
            <UI.Table.Row key = { i } positive = { isUnread }>
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
