// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { TX_STATUS, TX_SUB_STATUS } from './services/TransactionQueueService';
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
    POSITIVE:           'SUBMITTED',
    NEUTRAL:            'NEUTRAL',
    WARNING:            'WARNING',
    ERROR:              'ERROR',
};

const PAGE_SIZE         = 8;
const PAGE_MENU_SIZE    = 4;

//================================================================//
// PagingController
//================================================================//
class PagingController {

    @observable totalItems      = 0;
    @observable page            = 0;
    @observable pageCount       = 0;
    @observable pageMenuMin     = 0;

    //----------------------------------------------------------------//
    constructor ( totalItems ) {
        runInAction (() => {
            this.totalItems     = totalItems;
            this.pageCount      = Math.ceil ( totalItems / PAGE_SIZE );
        });
    }

    //----------------------------------------------------------------//
    finalize () {
    }

    //----------------------------------------------------------------//
    @action
    nextPage () {

        if (( this.page + 1 ) >= this.pageCount ) return;

        this.page++;

        if ( this.page >= this.pageMenuMax ) {
    
            this.pageMenuMin += PAGE_MENU_SIZE;

            const max = this.pageCount - PAGE_MENU_SIZE;

            if ( this.pageMenuMin > max ) {
                this.pageMenuMin = max;
            }
        }
    }

    //----------------------------------------------------------------//
    @computed get
    pageItemMin () {
        return this.page * PAGE_SIZE;
    }

    //----------------------------------------------------------------//
    @computed get
    pageItemMax () {
        const max = this.pageItemMin + PAGE_SIZE;
        return ( max < this.totalItems ) ? max : this.totalItems;
    }

    //----------------------------------------------------------------//
    @computed get
    pageMenuMax () {

        const max = this.pageMenuMin + PAGE_MENU_SIZE;
        return max < this.pageCount ? max : this.pageCount;
    }

    //----------------------------------------------------------------//
    @action
    prevPage () {

        if ( this.page <= 0 ) return;
        this.page--;
        
        if ( this.page < this.pageMenuMin ) {
            this.pageMenuMin = this.page > PAGE_MENU_SIZE ? this.pageMenuMin - PAGE_MENU_SIZE : 0;
        }
    }

    //----------------------------------------------------------------//
    @action
    setPage ( page ) {

        this.page = page;
    }
}

//================================================================//
// PagingMenu
//================================================================//
const PagingMenu = observer (( props ) => {

    const { controller } = props;

    const pageItems = [];
    for ( let i = controller.pageMenuMin; i < controller.pageMenuMax; ++i ) {

        pageItems.push (
            <UI.Menu.Item
                key = { i }
                as = 'a'
                onClick = {() => { controller.setPage ( i )}}
                active = { i === controller.page }
            >
                { i + 1 }
            </UI.Menu.Item>
        );
    }

    return (
        <UI.Menu floated = 'right' pagination>
            <UI.Menu.Item as = 'a' icon onClick = {() => { controller.prevPage (); }}>
                <UI.Icon name = 'chevron left' />
            </UI.Menu.Item>
            { pageItems }
            <UI.Menu.Item as = 'a' icon onClick = {() => { controller.nextPage (); }}>
                <UI.Icon name = 'chevron right'/>
            </UI.Menu.Item>
        </UI.Menu>
    );
});

//================================================================//
// TransactionQueueView
//================================================================//
export const TransactionQueueView = observer (( props ) => {
    
    const { transactions }      = props;
    const error                 = props.error || false;

    const pagingController      = hooks.useFinalizable (() => new PagingController ( transactions.length ));

    const getStatusView = ( transaction ) => {

        switch ( transaction.status ) {
            case TX_STATUS.STAGED:          return (<React.Fragment><UI.Icon name = 'clock' /> staged</React.Fragment>);
            case TX_STATUS.PENDING: {
                switch ( transaction.subStatus ) {
                    case TX_SUB_STATUS.SENT:        return (<React.Fragment><UI.Icon name = 'paper plane'/> sent</React.Fragment>);
                    case TX_SUB_STATUS.MIXED:       return (<React.Fragment><UI.Icon name = 'exclamation triangle'/> sent</React.Fragment>);
                    case TX_SUB_STATUS.REJECTED:    return (<React.Fragment><UI.Icon name = 'times circle'/> rejected</React.Fragment>);
                    case TX_SUB_STATUS.STALLED:     return (<React.Fragment><UI.Icon name = 'circle notched' loading/> stalled</React.Fragment>);
                    case TX_SUB_STATUS.LOST:        return (<React.Fragment><UI.Icon name = 'question'/> lost</React.Fragment>);
                }
            }
            case TX_STATUS.ACCEPTED:        return (<React.Fragment><UI.Icon name = 'check' /> accepted</React.Fragment>);
        }
        return <React.Fragment/>;
    }

    const getRowStatus = ( transaction ) => {

        switch ( transaction.status ) {
            case TX_STATUS.STAGED:          return ROW_STATUS.NEUTRAL;
            case TX_STATUS.PENDING: {
                switch ( transaction.subStatus ) {
                    
                    case TX_SUB_STATUS.SENT:        // fallthrough
                    case TX_SUB_STATUS.STALLED:     return ROW_STATUS.NEUTRAL;

                    case TX_SUB_STATUS.MIXED:       // fallthrough
                    case TX_SUB_STATUS.LOST:        return ROW_STATUS.WARNING;

                    case TX_SUB_STATUS.REJECTED:    return ROW_STATUS.ERROR;
                }
            }
            case TX_STATUS.ACCEPTED:        return ROW_STATUS.POSITIVE;
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
                <UI.Table.Cell collapsing>{ typeof ( transaction.nonce ) === 'number' ? transaction.nonce : '--' }</UI.Table.Cell>
                <UI.Table.Cell collapsing>{( transaction.status === TX_STATUS.PENDING ) ? transaction.miners.length : '--' }</UI.Table.Cell>
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
