// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { PagingMenu, PagingController } from './PagingMenu';
import { TX_STATUS }        from './transactions/Transaction';
import { Transaction }      from './transactions/Transaction';
import * as vol             from './util/vol';
import _                    from 'lodash';
import JSONTree             from 'react-json-tree';
import React, { useState }  from 'react';
import { assert, hooks, InfiniteScrollView, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }         from 'mobx-react';
import * as UI              from 'semantic-ui-react';

const ROW_STATUS = {
    POSITIVE:           'POSITIVE',
    NEUTRAL:            'NEUTRAL',
    WARNING:            'WARNING',
    ERROR:              'ERROR',
};

//================================================================//
// TransactionQueueView
//================================================================//
export const TransactionQueueView = observer (( props ) => {
    
    const { transactions }      = props;
    const error                 = props.error || false;

    const pagingController      = hooks.useFinalizable (() => new PagingController ( transactions.length ));

    const getStatusView = ( transaction ) => {

        switch ( transaction.status ) {

            // STAGED
            case TX_STATUS.STAGED:      return (<React.Fragment><UI.Icon name = 'clock' /> staged</React.Fragment>);

            // PENDING
            case TX_STATUS.PENDING:     return (<React.Fragment><UI.Icon name = 'clock'/> pending</React.Fragment>);
            case TX_STATUS.SENT:        return (<React.Fragment><UI.Icon name = 'paper plane'/> sent</React.Fragment>);
            case TX_STATUS.MIXED:       return (<React.Fragment><UI.Icon name = 'exclamation triangle'/> sent</React.Fragment>);
            case TX_STATUS.REJECTED:    return (<React.Fragment><UI.Icon name = 'times circle'/> rejected</React.Fragment>);
            case TX_STATUS.BLOCKED:     return (<React.Fragment><UI.Icon name = 'circle notched' loading/> blocked</React.Fragment>);

            // ACCEPTED
            case TX_STATUS.ACCEPTED:    return (<React.Fragment><UI.Icon name = 'check' /> accepted</React.Fragment>);
            case TX_STATUS.RESTORED:    return (<React.Fragment><UI.Icon name = 'cloud download' /> restored</React.Fragment>);
            case TX_STATUS.LOST:        return (<React.Fragment><UI.Icon name = 'question'/> lost</React.Fragment>);
        }
        return <React.Fragment/>;
    }

    const getRowStatus = ( transaction ) => {

        switch ( transaction.status ) {

            // POSITIVE
            case TX_STATUS.ACCEPTED:
            case TX_STATUS.RESTORED:
                return ROW_STATUS.POSITIVE;

            // NEUTRAL
            case TX_STATUS.STAGED:
            case TX_STATUS.PENDING:
            case TX_STATUS.SENT:
                return ROW_STATUS.NEUTRAL;

            // WARNING
            case TX_STATUS.MIXED:
            case TX_STATUS.BLOCKED:
            case TX_STATUS.LOST:
                return ROW_STATUS.WARNING;

            // ERROR
            case TX_STATUS.REJECTED:
                return ROW_STATUS.ERROR;
        }
        return ROW_STATUS.NEUTRAL;
    }

    let transactionList = [];
    for ( let i = pagingController.pageItemMin; i < pagingController.pageItemMax; ++i ) {

        const transaction = transactions [ transactions.length - i - 1 ];
        let friendlyName = Transaction.friendlyNameForType ( transaction.type );

        let json = {};
        if ( transaction.envelope ) {
            json = _.cloneDeep ( transaction.envelope );
            json.body = JSON.parse ( transaction.envelope.body );
        }
        else {
            json = transaction.body;
        }

        const rowStatus = getRowStatus ( transaction );

        transactionList.push (
            <UI.Table.Row
                key = { i }
                positive    = { rowStatus === ROW_STATUS.POSITIVE ? true : undefined }
                warning     = { rowStatus === ROW_STATUS.WARNING ? true : undefined }
                error       = { rowStatus === ROW_STATUS.ERROR ? true : undefined }
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
                                shouldExpandNode = {() => { return true; }}
                            />
                        }
                    />
                </UI.Table.Cell>
                <UI.Table.Cell collapsing>{ vol.format ( transaction.cost )}</UI.Table.Cell>
                <UI.Table.Cell>{ transaction.uuid }</UI.Table.Cell>
                <UI.Table.Cell collapsing>{ getStatusView ( transaction )}</UI.Table.Cell>
                <UI.Table.Cell collapsing>{( !transaction.isUnsent ) ? transaction.nonce : '--' }</UI.Table.Cell>
                <UI.Table.Cell collapsing>{( transaction.isPending ) ? `${ transaction.acceptedCount } / ${ transaction.miners.length }` : '--' }</UI.Table.Cell>
            </UI.Table.Row>
        );
    }

    for ( let i = pagingController.pageItemMax; i < ( pagingController.pageItemMin + pagingController.pageSize ); ++i ) {

        transactionList.push (
            <UI.Table.Row
                key = { i }
            >
                <UI.Table.Cell collapsing>--</UI.Table.Cell>
                <UI.Table.Cell collapsing>--</UI.Table.Cell>
                <UI.Table.Cell>00000000-0000-0000-0000-000000000000</UI.Table.Cell>
                <UI.Table.Cell collapsing>--</UI.Table.Cell>
                <UI.Table.Cell collapsing>--</UI.Table.Cell>
                <UI.Table.Cell collapsing>--</UI.Table.Cell>
            </UI.Table.Row>
        );
    }

    return (
        <UI.Table unstackable>
            
            <UI.Table.Header>
                <UI.Table.Row>
                    <UI.Table.HeaderCell>Type</UI.Table.HeaderCell>
                    <UI.Table.HeaderCell>Cost</UI.Table.HeaderCell>
                    <UI.Table.HeaderCell>UUID</UI.Table.HeaderCell>
                    <UI.Table.HeaderCell>Status</UI.Table.HeaderCell>
                    <UI.Table.HeaderCell>Nonce</UI.Table.HeaderCell>
                    <UI.Table.HeaderCell>Miners</UI.Table.HeaderCell>
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
