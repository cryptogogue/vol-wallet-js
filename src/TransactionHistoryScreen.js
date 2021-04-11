import { AppStateService }                              from './services/AppStateService';
import { AccountNavigationBar, ACCOUNT_TABS }           from './AccountNavigationBar';
import { AccountStateService }                          from './services/AccountStateService';
import { assert, hooks, InfiniteScrollView, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                                     from 'mobx-react';
import React, { useState, useRef, useLayoutEffect }     from 'react';
import JSONTree                                         from 'react-json-tree';
import * as UI                                          from 'semantic-ui-react';
import url                                              from 'url';

const PORT          = 9090;
const COUNT         = 4;

//const debugLog = function () {}
const debugLog = function ( ...args ) { console.log ( '@HISTORY:', ...args ); }

//================================================================//
// TransactionHistoryController
//================================================================//
class TransactionHistoryController {

    @observable nonce           = 0;
    @observable transactions    = [];
    @observable isRunning       = false;

    //----------------------------------------------------------------//
    constructor ( accountService ) {
        this.accountService = accountService;
        this.revocable = new RevocableContext ();
    }

    //----------------------------------------------------------------//
    async fetch ( nodeURL, options ) {
        try {
            const result = await this.revocable.fetchJSON ( nodeURL, options );
            console.log ( 'RESULT:', result );
            return ( result.method === ( options ? options.method : 'GET' ));
        }
        catch ( error ) {
            console.log ( error );
        }
        return false;
    }

    //----------------------------------------------------------------//
    finalize () {
        this.revocable.finalize ();
    }

    //----------------------------------------------------------------//
    async serviceLoop () {

        debugLog ( 'serviceLoop' );

        if ( !this.isRunning ) return;

        const nonce             = this.nonce;
        const accountService    = this.accountService;
        const networkService    = accountService.networkService;

        let isRunning           = this.isRunning;
        let transactions        = this.transactions;

        try {
            const next = nonce + this.transactions.length;
            const path = `/accounts/${ accountService.accountID }/history/transactions/${ next }`
            const data = await this.revocable.fetchJSON ( networkService.getServiceURL ( path ));
        
            debugLog ( 'TRANSACTIONS:', data );

            if ( !( data && data.transactions ) || ( data.transactions.length === 0 )) {
                isRunning = false;
            }
            else if ( this.nonce === nonce ) {
                transactions = transactions.concat ( data.transactions );
            }
            else {
                transactions = [];
            }
        }
        catch ( error ) {
            console.log ( error );
            isRunning = false;
        }

        runInAction (() => {
            this.isRunning      = isRunning;
            this.transactions   = transactions;
        });

        this.revocable.timeout (() => { this.serviceLoop ()}, 1 );
    }

    //----------------------------------------------------------------//
    @action toggle ( nonce ) {

        if ( this.isRunning ) {
            if ( nonce === this.nonce ) {
                this.isRunning = false;
            }
        }
        else {
            if ( nonce !== this.nonce ) {
                this.transactions = [];
            }
            this.isRunning = true;
            this.serviceLoop ();
        }
        this.nonce = nonce;
    }
}

//================================================================//
// TransactionHistoryScreen
//================================================================//
export const TransactionHistoryScreen = observer (( props ) => {

    const networkID = util.getMatch ( props, 'networkID' );
    const accountID = util.getMatch ( props, 'accountID' );

    const appState          = hooks.useFinalizable (() => new AppStateService ());
    const accountService    = appState.assertAccountService ( networkID, accountID );

    const controller                    = hooks.useFinalizable (() => new TransactionHistoryController ( accountService ));
    const [ nonceStr, setNonceStr ]     = useState ( 0 );

    const nonce = parseInt ( nonceStr );

    let onToggle = () => {
        controller.toggle ( nonce );
    }

    const list = [];
    for ( let transaction of controller.transactions ) {

        const body = JSON.parse ( transaction.body );
        debugLog ( body );

        list.push (
            <UI.Message
                key = { list.length }
            >
                <UI.Message.Header>{ `${ body.maker.nonce }: ${ body.type }` }</UI.Message.Header>
                <UI.Message.Content>
                    <JSONTree
                        hideRoot
                        data = { body }
                        theme = 'bright'
                    />
                </UI.Message.Content>
            </UI.Message>
        );
    }

    const toggleEnable  = Boolean ( Number.isInteger ( nonce ));
    const isRunning     = controller.isRunning;
    const iconName      = isRunning ? ( nonce === controller.nonce ? 'pause' : 'refresh' ) : 'play';
    const iconColor     = isRunning ? 'red' : 'green';

    return (
        <SingleColumnContainerView>

            <AccountNavigationBar
                accountService      = { accountService }
                tab                 = { ACCOUNT_TABS.HISTORY }
            />

            <UI.Segment>
                <UI.Form>
                    <UI.Form.Field>
                        <UI.Input
                            fluid
                            action = {
                                <UI.Button
                                    icon = { iconName }
                                    color = { toggleEnable ? iconColor : 'grey' }
                                    disabled = { !toggleEnable }
                                    onClick = { onToggle }
                                />
                            }
                            placeholder     = 'Starting Nonce'
                            name            = 'nonce'
                            type            = 'number'
                            min             = '0'
                            step            = '1'
                            value           = { nonceStr }
                            onChange        = {( event ) => { setNonceStr ( event.target.value )}}
                        />
                    </UI.Form.Field>
                </UI.Form>

                <UI.List>
                    { list }
                </UI.List>

            </UI.Segment>
        </SingleColumnContainerView>
    );
});

