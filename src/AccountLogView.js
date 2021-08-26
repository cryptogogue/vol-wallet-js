// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { PagingMenu, PagingController } from './PagingMenu';
import { Transaction, TRANSACTION_TYPE } from './transactions/Transaction';
import _                    from 'lodash';
import React                from 'react';
import { hooks }            from 'fgc';
import { DateTime }         from 'luxon';
import { computed }         from 'mobx';
import { observer }         from 'mobx-react';
import * as UI              from 'semantic-ui-react';

//================================================================//
// Filter
//================================================================//
class Filter {

    //----------------------------------------------------------------//
    constructor ( entries ) {

        this.unfiltered = entries;
    }

    //----------------------------------------------------------------//
    @computed get
    filtered () {

        let index = 0;
        const filtered = [];
        for ( let entry of this.unfiltered ) {

            const transaction = entry.transaction;

            switch ( transaction.type ) {
                case TRANSACTION_TYPE.ACCOUNT_POLICY:
                case TRANSACTION_TYPE.AFFIRM_KEY:
                case TRANSACTION_TYPE.BETA_GET_ASSETS:
                case TRANSACTION_TYPE.BETA_GET_DECK:
                case TRANSACTION_TYPE.BUY_ASSETS:
                case TRANSACTION_TYPE.CANCEL_OFFER:
                case TRANSACTION_TYPE.KEY_POLICY:
                case TRANSACTION_TYPE.OFFER_ASSETS:
                case TRANSACTION_TYPE.OPEN_ACCOUNT:
                case TRANSACTION_TYPE.PUBLISH_SCHEMA:
                case TRANSACTION_TYPE.PUBLISH_SCHEMA_AND_RESET:
                case TRANSACTION_TYPE.REGISTER_MINER:
                case TRANSACTION_TYPE.RENAME_ACCOUNT:
                case TRANSACTION_TYPE.RESERVE_ACCOUNT_NAME:
                case TRANSACTION_TYPE.RUN_SCRIPT:
                case TRANSACTION_TYPE.SEND_ASSETS:
                case TRANSACTION_TYPE.SEND_VOL:
                case TRANSACTION_TYPE.STAMP_ASSETS:
                case TRANSACTION_TYPE.UPGRADE_ASSETS:
                    filtered.push ( index );
                    break;
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
// AccountLogView
//================================================================//
export const AccountLogView = observer (( props ) => {
    
    const accountService        = props.accountService;
    const filter                = hooks.useFinalizable (() => new Filter ( props.entries ));
    const pagingController      = hooks.useFinalizable (() => new PagingController ( filter.filtered.length ));

    const filtered              = filter.filtered;
    const entries               = props.entries;

    let transactionList = [];
    for ( let i = pagingController.pageItemMin; i < pagingController.pageItemMax; ++i ) {

        const index         = filtered [ filtered.length - i - 1 ];
        const entry         = entries [ index ];
        const isUnread      = (( accountService.index !== entry.makerIndex ) && ( index >= accountService.inboxRead ));

        const time          = new DateTime.fromISO ( entry.time );
        const friendlyName  = Transaction.friendlyNameForType ( entry.type );

        transactionList.push (
            <UI.Table.Row key = { i } positive = { isUnread }>
                <UI.Table.Cell collapsing>{ time.toLocaleString ( DateTime.DATETIME_SHORT )}</UI.Table.Cell>
                <UI.Table.Cell collapsing>{ friendlyName }</UI.Table.Cell>
                <UI.Table.Cell>{ entry.explanation }</UI.Table.Cell>
            </UI.Table.Row>
        );
    }

    return (
        <UI.Table unstackable>
            
            <UI.Table.Header>
                <UI.Table.Row>
                    <UI.Table.HeaderCell>Time</UI.Table.HeaderCell>
                    <UI.Table.HeaderCell>Transaction</UI.Table.HeaderCell>
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
