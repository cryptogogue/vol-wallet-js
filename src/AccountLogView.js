// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import _                        from 'lodash';
import { hooks }                from 'fgc';
import { DateTime }             from 'luxon';
import { computed }             from 'mobx';
import { observer }             from 'mobx-react';
import React, { useState }      from 'react';
import * as UI                  from 'semantic-ui-react';
import { Transaction }          from 'vol';

const PAGE_SIZE         = 8;

//================================================================//
// AccountLogView
//================================================================//
export const AccountLogView = observer (( props ) => {
    
    const { entries }           = props;
    const accountService        = props.accountService;
    const [ page, setPage ]     = useState ( 0 );

    const totalPages            = Math.ceil ( entries.length / PAGE_SIZE );

    const pageBase  = page * PAGE_SIZE;
    const pageTop   = Math.min ( entries.length, pageBase + PAGE_SIZE );

    let transactionList = [];
    for ( let i = pageBase; i < pageTop; ++i ) {

        const index         = entries.length - i - 1;
        const entry         = entries [ index ];
        const isUnread      = ( !entry.isMaker && ( index >= accountService.inboxRead ));

        const time          = new DateTime.fromISO ( entry.time );
        const friendlyName  = Transaction.friendlyNameForType ( entry.type );

        transactionList.push (
            <UI.Table.Row key = { i } positive = { isUnread }>
                <UI.Table.Cell collapsing>{ time.toLocaleString ( DateTime.DATETIME_SHORT )}</UI.Table.Cell>
                <UI.Table.Cell collapsing><UI.Icon name = { entry.isMaker ? 'sign-out alternate' : 'sign-in alternate' }/></UI.Table.Cell>
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
                    <UI.Table.HeaderCell></UI.Table.HeaderCell>
                    <UI.Table.HeaderCell>Transaction</UI.Table.HeaderCell>
                    <UI.Table.HeaderCell>Note</UI.Table.HeaderCell>
                </UI.Table.Row>
            </UI.Table.Header>

            <UI.Table.Body>
                { transactionList }
            </UI.Table.Body>

            <If condition = { totalPages > 1 }>
                <UI.Table.Footer>
                    <UI.Table.Row>
                        <UI.Table.HeaderCell colSpan = '4' textAlign = 'center'>
                            <UI.Pagination
                                activePage      = { page + 1 }
                                totalPages      = { totalPages }
                                onPageChange    = {( event, data ) => { setPage ( data.activePage - 1 ); }}
                            />
                    </UI.Table.HeaderCell>
                    </UI.Table.Row>
                </UI.Table.Footer>
            </If>

        </UI.Table>
    );
});
