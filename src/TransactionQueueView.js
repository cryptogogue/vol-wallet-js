// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { Transaction }                      from './transactions/Transaction';
import { TX_MINER_STATUS, TX_STATUS }       from './transactions/TransactionQueueEntry';
import _                                    from 'lodash';
import JSONTree                             from 'react-json-tree';
import React, { useState }                  from 'react';
import { hooks }                            from 'fgc';
import { observer }                         from 'mobx-react';
import * as UI                              from 'semantic-ui-react';
import * as vol                             from 'vol';

const ROW_STATUS = {
    POSITIVE:           'POSITIVE',
    NEUTRAL:            'NEUTRAL',
    WARNING:            'WARNING',
    ERROR:              'ERROR',
};

const PAGE_SIZE         = 8;

//================================================================//
// TransactionStatusModal
//================================================================//
export const TransactionStatusModal = observer (( props ) => {

    const { transaction, transactionQueue, onClose } = props;

    const getMinerStatusView = ( minerStatus, minerBusy ) => {

        if ( minerStatus === TX_MINER_STATUS.ACCEPTED )         return <React.Fragment><UI.Icon name = 'check' /> accepted</React.Fragment>;
        if ( minerStatus === TX_MINER_STATUS.REJECTED )         return <React.Fragment><UI.Icon name = 'times circle' /> rejected</React.Fragment>;

        if ( minerBusy ) {
            if ( minerStatus === TX_MINER_STATUS.NEW )          return <React.Fragment><UI.Icon name = 'circle notch' loading/> new</React.Fragment>;
            if ( minerStatus === TX_MINER_STATUS.TIMED_OUT )    return <React.Fragment><UI.Icon name = 'circle notch' loading/> timed out</React.Fragment>;
        }
        else {
            if ( minerStatus === TX_MINER_STATUS.NEW )          return <React.Fragment><UI.Icon name = 'clock'/> new</React.Fragment>;
            if ( minerStatus === TX_MINER_STATUS.TIMED_OUT )    return <React.Fragment><UI.Icon name = 'question'/> timed out</React.Fragment>;
        }
        return <React.Fragment/>;
    }

    const getRowStatus = ( minerStatus ) => {

        switch ( minerStatus ) {
            case TX_MINER_STATUS.NEW:           return ROW_STATUS.NEUTRAL;
            case TX_MINER_STATUS.ACCEPTED:      return ROW_STATUS.POSITIVE;
            case TX_MINER_STATUS.REJECTED:      return ROW_STATUS.ERROR;
            case TX_MINER_STATUS.TIMED_OUT:     return ROW_STATUS.WARNING;
        }
        return ROW_STATUS.NEUTRAL;
    }

    let minerList = [];
    for ( let minerID in transaction.minerStatus ) {

        const minerStatus   = transaction.minerStatus [ minerID ];
        const minerBusy     = transaction.minerBusy [ minerID ] || false;
        const rowStatus     = getRowStatus ( minerStatus );

        minerList.push (
            <UI.Table.Row
                key         = { minerID }
                positive    = { rowStatus === ROW_STATUS.POSITIVE ? true : undefined }
                warning     = { rowStatus === ROW_STATUS.WARNING ? true : undefined }
                error       = { rowStatus === ROW_STATUS.ERROR ? true : undefined }
            >
                <UI.Table.Cell collapsing>{ minerID }</UI.Table.Cell>
                <UI.Table.Cell>{ getMinerStatusView ( minerStatus, minerBusy )}</UI.Table.Cell>
            </UI.Table.Row>
        );
    }

    return (
        <UI.Modal
            open
            closeIcon
            onClose     = { onClose }
        >
            <UI.Modal.Header>{ transaction.uuid }</UI.Modal.Header>

            <UI.Modal.Content>

                <UI.Table unstackable>
                    <UI.Table.Header>
                        <UI.Table.Row>
                            <UI.Table.HeaderCell>MinerID</UI.Table.HeaderCell>
                            <UI.Table.HeaderCell>Status</UI.Table.HeaderCell>
                        </UI.Table.Row>
                    </UI.Table.Header>

                    <UI.Table.Body>
                        { minerList }
                    </UI.Table.Body>
                </UI.Table>

                <div style = {{ textAlign: 'center' }}>

                    <UI.Header.Subheader>
                        Your transaction will not be marked 'accepted' until <b>Height</b> and <b>Nonce</b> have changed. This may take several minutes and/or blocks.
                    </UI.Header.Subheader>

                    <UI.Header.Subheader>
                        { `Nonce: ${ transactionQueue.accountService.nonce }` }
                    </UI.Header.Subheader>

                    <UI.Header.Subheader>
                        { `Height: ${ transactionQueue.networkService.height }` }
                    </UI.Header.Subheader>

                    <UI.Header.Subheader style = {{ fontSize: 9 }}>
                        { `${ transactionQueue.networkService.digest }` }
                    </UI.Header.Subheader>
                </div>

            </UI.Modal.Content>
        </UI.Modal>
    );
});

//================================================================//
// TransactionQueueView
//================================================================//
export const TransactionQueueView = observer (( props ) => {
    
    const { transactionQueue }              = props;
    const error                             = props.error || false;
    const transactions                      = transactionQueue.queue;

    const [ txBody, setTxBody ]             = useState ( false );
    const [ txForModal, setTxForModal ]     = useState ( false );
    const [ page, setPage ]                 = useState ( 0 );

    const totalPages                        = Math.ceil ( transactions.length / PAGE_SIZE );

    const loadBody = async ( uuid ) => {
        setTxBody ( await transactionQueue.getTransactionBodyAsync ( uuid ));
    }

    const onCloseModal = async ( uuid ) => {
        setTxBody ( false );
    }

    const getStatusView = ( transaction ) => {

        switch ( transaction.status ) {

            // STAGED
            case TX_STATUS.STAGED:      return (<React.Fragment><UI.Icon name = 'clock' /> staged</React.Fragment>);

            // PENDING
            case TX_STATUS.PENDING:     return (<React.Fragment><UI.Icon name = 'clock'/> pending</React.Fragment>);
            case TX_STATUS.SENDING:     return (<React.Fragment><UI.Icon name = 'circle notched' loading/> submitting</React.Fragment>);
            case TX_STATUS.MIXED:       return (<React.Fragment><UI.Icon name = 'exclamation triangle'/> submitting</React.Fragment>);

            case TX_STATUS.REJECTED:    return (<React.Fragment><UI.Icon name = 'times circle'/> rejected</React.Fragment>);
            case TX_STATUS.BLOCKED:     return (<React.Fragment><UI.Icon name = 'exclamation triangle'/> cancelled</React.Fragment>);

            // ACCEPTED
            case TX_STATUS.ACCEPTED:    return (<React.Fragment><UI.Icon name = 'check' /> accepted</React.Fragment>);
            case TX_STATUS.RESTORED:    return (<React.Fragment><UI.Icon name = 'check' /> accepted</React.Fragment>);
            case TX_STATUS.LOST:        return (<React.Fragment><UI.Icon name = 'circle notched' loading/> recovering</React.Fragment>);
        }
        return <React.Fragment/>;
    }

    const getRowStatus = ( transaction ) => {

        switch ( transaction.status ) {

            // POSITIVE
            case TX_STATUS.ACCEPTED:
            case TX_STATUS.RESTORED:
            case TX_STATUS.LOST:
                return ROW_STATUS.POSITIVE;

            // NEUTRAL
            case TX_STATUS.STAGED:
            case TX_STATUS.PENDING:
            case TX_STATUS.SENDING:
                return ROW_STATUS.NEUTRAL;

            // WARNING
            case TX_STATUS.MIXED:
            case TX_STATUS.BLOCKED:
                return ROW_STATUS.WARNING;

            // ERROR
            case TX_STATUS.REJECTED:
                return ROW_STATUS.ERROR;
        }
        return ROW_STATUS.NEUTRAL;
    }

    const pageBase  = page * PAGE_SIZE;
    const pageTop   = Math.min ( transactions.length, pageBase + PAGE_SIZE );

    let transactionList = [];
    for ( let i = pageBase; i < pageTop; ++i ) {

        const transaction = transactions [ transactions.length - i - 1 ];
        let friendlyName = Transaction.friendlyNameForType ( transaction.type );

        const rowStatus = getRowStatus ( transaction );

        transactionList.push (
            <UI.Table.Row
                key         = { i }
                positive    = { rowStatus === ROW_STATUS.POSITIVE ? true : undefined }
                warning     = { rowStatus === ROW_STATUS.WARNING ? true : undefined }
                error       = { rowStatus === ROW_STATUS.ERROR ? true : undefined }
            >
                <UI.Table.Cell collapsing>
                    <UI.Header
                        as          = 'h5'
                        style       = {{ cursor: 'pointer' }}
                        onClick     = {() => { loadBody ( transaction.uuid )}}
                    >
                        { friendlyName }
                    </UI.Header>
                </UI.Table.Cell>

                <UI.Table.Cell collapsing>{ vol.util.format ( transaction.cost )}</UI.Table.Cell>
                <UI.Table.Cell>{ transaction.uuid }</UI.Table.Cell>
                <UI.Table.Cell collapsing>{ getStatusView ( transaction )}</UI.Table.Cell>
                <UI.Table.Cell collapsing>{( !transaction.isUnsent ) ? transaction.nonce : '--' }</UI.Table.Cell>
                <Choose>
                    <When condition = { transaction.isPending }>
                        <UI.Table.Cell collapsing
                            style           = {{ cursor: 'pointer' }}
                            onClick         = {() => { setTxForModal ( transaction )}}
                        >
                            { transaction.acceptingMiners.length }
                        </UI.Table.Cell>
                    </When>
                    <Otherwise>
                         <UI.Table.Cell collapsing>--</UI.Table.Cell>
                    </Otherwise>
                </Choose>
            </UI.Table.Row>
        );
    }

    // TODO: the JSONTree below leaks DOM nodes like crazy

    return (
        <React.Fragment>

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

                <If condition = { totalPages > 1 }>
                    <UI.Table.Footer>
                        <UI.Table.Row>
                            <UI.Table.HeaderCell colSpan = '6' textAlign = 'center'>
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

            <UI.Modal
                open        = { txBody !== false }
                onClose     = {() => { onCloseModal ()}}
                header      = 'Transaction Body'
                content     = {
                    <JSONTree
                        hideRoot
                        data = { txBody ? txBody : {}}
                        theme = 'bright'
                        shouldExpandNode = {() => { return true; }}
                    />
                }
            />

            <If condition = { txForModal !== false }>
                <TransactionStatusModal
                    transaction             = { txForModal }
                    transactionQueue        = { transactionQueue }
                    onClose                 = {() => { setTxForModal ( false )}}
                />
            </If>
        </React.Fragment>
    );
});
