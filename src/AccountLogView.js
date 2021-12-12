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
// AccountLogView
//================================================================//
export const AccountLogView = observer (( props ) => {
    
    const { entries }           = props;
    const accountService        = props.accountService;
    const pagingController      = hooks.useFinalizable (() => new PagingController ( entries.length ));

    let transactionList = [];
    for ( let i = pagingController.pageItemMin; i < pagingController.pageItemMax; ++i ) {

        const index         = entries.length - i - 1;
        const entry         = entries [ index ];
        const isUnread      = ( !entry.isMaker && ( index >= accountService.inboxRead ));

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
