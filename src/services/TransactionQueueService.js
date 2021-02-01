// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as entitlements                from '../util/entitlements';
import { NetworkStateService }          from './NetworkStateService';
import { InventoryService }             from './InventoryService';
import { InventoryTagsController }      from './InventoryTagsController';
import { InventoryController }          from 'cardmotron';
import { assert, crypto, excel, ProgressController, randomBytes, RevocableContext, SingleColumnContainerView, StorageContext, util } from 'fgc';
import * as bcrypt                      from 'bcryptjs';
import _                                from 'lodash';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import React                            from 'react';

//================================================================//
// TransactionQueueService
//================================================================//
export class TransactionQueueService {

    //----------------------------------------------------------------//
    @computed get
    account () {
        return this.appState.account;
    }

    //----------------------------------------------------------------//
    @computed get
    assetsUtilized () {

        let assetsUtilized = [];

        // touch .length to force update if change (mobx)
        const pendingTransactions = this.pendingTransactions;
        if ( pendingTransactions.length ) {
            for ( let i in pendingTransactions ) {
                assetsUtilized = assetsUtilized.concat ( pendingTransactions [ i ].assets );
            }
        }

        // touch .length to force update if change (mobx)
        const stagedTransactions = this.stagedTransactions;
        if ( stagedTransactions.length ) {
            for ( let i in stagedTransactions ) {
                assetsUtilized = assetsUtilized.concat ( stagedTransactions [ i ].assets );
            }
        }
        return assetsUtilized;
    }

    //----------------------------------------------------------------//
    @computed get
    canClearTransactions () {

        return (( this.stagedTransactions.length > 0 ) || ( this.pendingTransactions.length > 0 ));
    }

    //----------------------------------------------------------------//
    @computed get
    canSubmitTransactions () {

        if ( this.appState.nonce < 0 ) return false;

        if ( this.stagedTransactions.length > 0 ) return true;
        if (( this.pendingTransactions.length > 0 ) && ( this.hasTransactionError )) return true;

        return false;
    }

    //----------------------------------------------------------------//
    @action
    clearPendingTransactions () {

        this.account.pendingTransactions = [];
        this.account.transactionError = false;
    }

    //----------------------------------------------------------------//
    @action
    clearStagedTransactions () {

        this.account.stagedTransactions = [];
    }

    //----------------------------------------------------------------//
    constructor ( appState ) {
        
        this.revocable = new RevocableContext ();
        this.appState = appState;

        this.processTransactionsAsync ();
    }

    //----------------------------------------------------------------//
    @computed get
    cost () {

        let cost = 0;

        const pendingTransactions = this.pendingTransactions;
        for ( let i in pendingTransactions ) {
            cost += pendingTransactions [ i ].cost;
        }

        const stagedTransactions = this.stagedTransactions;
        for ( let i in stagedTransactions ) {
            cost += stagedTransactions [ i ].cost;
        }

        return cost;
    }

    //----------------------------------------------------------------//
    @action
    deleteTransactions () {

        this.account.pendingTransactions = [];
        this.account.stagedTransactions = [];
    }

    //----------------------------------------------------------------//
    finalize () {

        this.revocable.finalize ();
    }

    //----------------------------------------------------------------//
    @computed get
    hasTransactionError () {
        return Boolean ( this.account.transactionError );
    }

    //----------------------------------------------------------------//
    @computed get
    pendingTransactions () {
        return this.appState.account.pendingTransactions;
    }

    //----------------------------------------------------------------//
    @action
    async processTransactionsAsync () {

        const appState = this.appState;
        const account = this.account;

        if ( !this.hasTransactionError ) {

            let pendingTransactions = this.pendingTransactions;
            let more = pendingTransactions.length > 0;
            
            while ( more && ( pendingTransactions.length > 0 )) {

                more = false;

                const memo          = pendingTransactions [ 0 ];
                const accountName   = memo.body.maker.accountName;
                
                try {

                    // get every active URL.
                    const urls = appState.getServiceURLs ( `/accounts/${ accountName }/transactions/${ memo.uuid }` );

                    // check status of transaction on them all.
                    const promises = [];
                    for ( let serviceURL of urls ) {
                        promises.push ( this.revocable.fetchJSON ( serviceURL ));
                    }

                    // wait for them all to respond.
                    const results = await this.revocable.all ( promises );

                    let acceptedCount = 0;
                    let rejected = [];

                    // iterate through the results and tabulate.
                    for ( let result of results ) {

                        switch ( result.status ) {

                            case 'ACCEPTED':
                                acceptedCount++;
                                break;

                            case 'REJECTED':
                            case 'IGNORED':
                                rejected.push ( result );
                                break;

                            case 'UNKNOWN':
                                // re-send he transaction if not recognized.
                                await this.putTransactionAsync ( memo );
                                break;

                            default:
                                break;
                        }
                    }

                    if ( results.length ) {

                        // if *all* nodes have accepted the transaction, remove it from the queue and advance.
                        if ( acceptedCount === results.length ) {

                            console.log ( 'ACCEPTED:', acceptedCount );

                            runInAction (() => {
                                const assetsSent = _.clone ( account.assetsSent || {});
                                for ( let assetID of memo.assets ) {
                                    assetsSent [ assetID ] = assetID;
                                }
                                pendingTransactions.shift ();
                                account.assetsSent = assetsSent;
                            });
                            
                            more = true;
                        }

                        // if *all* nodes have rejected the transaction, stop and report.
                        if ( rejected.length === results.length ) {
                            runInAction (() => {
                                account.transactionError = {
                                    message:    rejected [ 0 ].message,
                                    uuid:       rejected [ 0 ].uuid,
                                }
                            });
                        }
                    }
                }
                catch ( error ) {
                    console.log ( 'AN ERROR!', error );
                }
            }
        }
    }

    //----------------------------------------------------------------//
    @action
    pushTransaction ( transaction ) {

        let memo = {
            type:               transaction.type,
            note:               transaction.note,
            cost:               transaction.getCost (),
            body:               transaction.body,
            assets:             transaction.assetsUtilized,
            uuid:               util.generateUUIDV4 (),
        }

        const appState = this.appState;
        appState.account.stagedTransactions.push ( memo );
        appState.flags.promptFirstTransaction = false;
    }

    //----------------------------------------------------------------//
    async putTransactionAsync ( memo ) {

        const accountName   = memo.body.maker.accountName;
        const serviceURL    = this.appState.getServiceURL ( `/accounts/${ accountName }/transactions/${ memo.uuid }` );

        const result = await this.revocable.fetchJSON ( serviceURL, {
            method :    'PUT',
            headers :   { 'content-type': 'application/json' },
            body :      JSON.stringify ( memo.envelope, null, 4 ),
        });

        return ( result.status === 'OK' );
    }

    //----------------------------------------------------------------//
    async putTransactionsAsync ( memo ) {

        const accountName   = memo.body.maker.accountName;
        const urls          = this.appState.getServiceURLs ( `/accounts/${ accountName }/transactions/${ memo.uuid }` );
        const headers       = { 'content-type': 'application/json' };
        const body          = JSON.stringify ( memo.envelope, null, 4 );

        const promises = [];
        for ( let serviceURL of urls ) {
            promises.push ( this.revocable.fetchJSON ( serviceURL, {
                method :    'PUT',
                headers :   headers,
                body :      body,
            }));
        }

        const results = await this.revocable.all ( promises );

        let okCount = 0;
        for ( let result of results ) {
            okCount += ( result.status === 'OK' ) ? 1 : 0;
        }

        return ( results.length === okCount );
    }

    //----------------------------------------------------------------//
    @computed get
    stagedTransactions () {

        return this.account.stagedTransactions;
    }

    //----------------------------------------------------------------//
    @action
    async submitTransactions ( password ) {

        this.appState.assertHasAccount ();
        this.appState.assertPassword ( password );

        let account = this.account;

        let stagedTransactions      = account.stagedTransactions;
        let pendingTransactions     = account.pendingTransactions;

        try {

            const queue = [];
            const currentNonce = this.appState.nonce;

            for ( let i = 0; i < pendingTransactions.length; ++i ) {
                queue.push ( _.cloneDeep ( pendingTransactions [ i ]));
            }

            for ( let i = 0; i < stagedTransactions.length; ++i ) {
                queue.push ( _.cloneDeep ( stagedTransactions [ i ]));
            }

            const recordBy = new Date ();
            recordBy.setTime ( recordBy.getTime () + ( 8 * 60 * 60 * 1000 )); // yuck

            for ( let i = 0; i < queue.length; ++i ) {

                let memo            = queue [ i ];
                let nonce           = currentNonce + i;

                let body            = memo.body;
                body.uuid           = memo.uuid;
                body.maxHeight      = 0; // don't use for now
                body.recordBy       = recordBy.toISOString ();
                body.maker.nonce    = nonce;

                let envelope = {
                    body: JSON.stringify ( body ),
                };

                const hexKey            = account.keys [ body.maker.keyName ];
                const privateKeyHex     = crypto.aesCipherToPlain ( hexKey.privateKeyHexAES, password );
                const key               = await crypto.keyFromPrivateHex ( privateKeyHex );

                envelope.signature = {
                    hashAlgorithm:  'SHA256',
                    digest:         key.hash ( envelope.body ),
                    signature:      key.sign ( envelope.body ),
                };

                memo.envelope   = envelope;
                memo.nonce      = nonce;
            }

            // submit these *before* clearing any cached transaction errors!
            const submitted = [];
            while ( queue.length ) {
                const memo = queue.shift ();
                if ( await this.putTransactionsAsync ( memo )) {
                    submitted.push ( memo );
                }
                else {
                    break;
                }
            }

            runInAction (() => {
                account.stagedTransactions     = queue;
                account.pendingTransactions    = submitted;
                account.transactionError       = false; // OK to clear the transaction error no.
            });
        }
        catch ( error ) {
             console.log ( 'AN ERROR!', error );
        }
    }

    //----------------------------------------------------------------//
    @computed get
    transactionError () {
        return this.account.transactionError || false;
    }
}
