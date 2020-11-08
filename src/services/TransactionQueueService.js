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

    // //----------------------------------------------------------------//
    // checkTransactionEntitlements ( transactionType ) {

    //     const account = this.appState.account;
    //     if ( account ) {
    //         for ( let keyName in account.keys ) {
    //             const key = account.keys [ keyName ];
    //             if ( key.entitlements && entitlements.check ( key.entitlements.policy, transactionType )) return true;
    //         }
    //     }
    //     return false;
    // }

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

                    const url = `${ appState.network.nodeURL }/accounts/${ accountName }/transactions/${ memo.uuid }`;
                    const checkResult = await this.revocable.fetchJSON ( url );

                    switch ( checkResult.status ) {

                        case 'ACCEPTED':
                            runInAction (() => {
                                const assetsSent = _.clone ( account.assetsSent || {});
                                for ( let assetID of memo.assets ) {
                                    assetsSent [ assetID ] = assetID;
                                }
                                pendingTransactions.shift ();
                                account.assetsSent = assetsSent;
                            });
                            more = true;
                            break;

                        case 'REJECTED':
                            runInAction (() => {
                                account.transactionError = {
                                    message:    checkResult.message,
                                    uuid:       checkResult.uuid,
                                }
                            });
                            break;

                        case 'UNKNOWN':
                            await this.putTransactionAsync ( memo );
                            break;

                        default:
                            break;
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
        this.setNextTransactionCost ( 0 );
    }

    //----------------------------------------------------------------//
    async putTransactionAsync ( memo ) {

        const accountName   = memo.body.maker.accountName;
        const url           = `${ this.appState.network.nodeURL }/accounts/${ accountName }/transactions/${ memo.uuid }`;

        const result = await this.revocable.fetchJSON ( url, {
            method :    'PUT',
            headers :   { 'content-type': 'application/json' },
            body :      JSON.stringify ( memo.envelope, null, 4 ),
        });
        return ( result.status === 'RETRY' );
    }

    //----------------------------------------------------------------//
    @action
    setNextTransactionCost ( cost ) {

        this.appState.nextTransactionCost = cost || 0;
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
                if ( await this.putTransactionAsync ( memo )) {
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

    //----------------------------------------------------------------//
    @action
    updateAccount ( accountUpdate, entitlements ) {

        let account = this.account;
        if ( !account ) return;

        account.policy          = accountUpdate.policy;
        account.bequest         = accountUpdate.bequest;
        account.entitlements    = entitlements.account;

        for ( let keyName in accountUpdate.keys ) {

            let key = account.keys [ keyName ];
            if ( !key ) continue;

            let keyUpdate = accountUpdate.keys [ keyName ];
            let publicKeyHex = keyUpdate.key.publicKey;

            // TODO: handle all the business around expiring keys
            if ( key.publicKeyHex === keyUpdate.key.publicKey ) {
                key.policy          = keyUpdate.policy;
                key.bequest         = keyUpdate.bequest;
                key.entitlements    = entitlements.keys [ keyName ];
            }
        }
    }
}
