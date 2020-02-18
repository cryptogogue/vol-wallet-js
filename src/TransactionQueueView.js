// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { Transaction }      from './Transaction';
import _                    from 'lodash';
import JSONTree             from 'react-json-tree';
import React, { useState }  from 'react';
import { observer }         from 'mobx-react';
import * as UI              from 'semantic-ui-react';

//================================================================//
// TransactionQueueView
//================================================================//
export const TransactionQueueView = observer (( props ) => {
    
    const { transactions } = props;
    const showNonce = props.showNonce || false;

    let transactionList = [];
    for ( let i in transactions ) {

        const transaction = transactions [ i ];
        let friendlyName = Transaction.friendlyNameForType ( transaction.type );

        let json = {};
        if ( transaction.envelope ) {
            json = _.cloneDeep ( transaction.envelope );
            json.body = JSON.parse ( transaction.envelope.body );
        }
        else {
            json = transaction.body;
        }

        transactionList.push (
            <UI.Table.Row
                key = { i }
                positive = { Boolean ( transaction.envelope )}
            >
                <UI.Table.Cell collapsing>
                    <UI.Modal
                        header      = 'Transaction Body'
                        trigger     = {
                            <UI.Header
                                as = 'h5'
                                style = {{ cursor: 'pointer' }}
                            >
                                { friendlyName }
                            </UI.Header>
                        }
                        content     = {
                            <JSONTree
                                hideRoot
                                data = { json }
                                theme = 'bright'
                            />
                        }
                    />
                </UI.Table.Cell>
                <UI.Table.Cell collapsing>{ transaction.cost }</UI.Table.Cell>
                <UI.Table.Cell>{ transaction.note }</UI.Table.Cell>
                <UI.Table.Cell collapsing>{ typeof ( transaction.nonce ) === 'number' ? transaction.nonce : '--' }</UI.Table.Cell>
            </UI.Table.Row>
        );
    }

    return (
        <UI.Table unstackable>
            <UI.Table.Header>
                <UI.Table.Row>
                    <UI.Table.HeaderCell>Type</UI.Table.HeaderCell>
                    <UI.Table.HeaderCell>Cost</UI.Table.HeaderCell>
                    <UI.Table.HeaderCell>Note</UI.Table.HeaderCell>
                    <UI.Table.HeaderCell>Nonce</UI.Table.HeaderCell>
                </UI.Table.Row>
            </UI.Table.Header>
            <UI.Table.Body>
                { transactionList }
            </UI.Table.Body>
        </UI.Table>
    );
});
