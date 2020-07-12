// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AccountInfoService }           from './AccountInfoService';
import { NetworkStateService }          from './NetworkStateService';
import { InventoryService }             from './InventoryService';
import { InventoryTagsController }      from './InventoryTagsController';
import * as entitlements                from './util/entitlements';
import { InventoryController }          from 'cardmotron';
import { assert, crypto, excel, ProgressController, randomBytes, RevocableContext, SingleColumnContainerView, StorageContext, util } from 'fgc';
import * as bcrypt                      from 'bcryptjs';
import _                                from 'lodash';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import React                            from 'react';

//================================================================//
// AccountStateService
//================================================================//
export class AccountStateService extends NetworkStateService {

    //----------------------------------------------------------------//
    @computed get
    account () {
        return this.getAccount ();
    }

    //----------------------------------------------------------------//
    @computed get
    accountKeyNames () {
        const account = this.account;
        return ( account && Object.keys ( account.keys )) || [];
    }

    //----------------------------------------------------------------//
    assertHasAccount () {
        this.assertHasNetwork ();
        if ( !this.hasAccount ) throw new Error ( 'No account selected.' );
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
    balance () {

        let cost = 0;

        const pendingTransactions = this.pendingTransactions;
        for ( let i in pendingTransactions ) {
            cost += pendingTransactions [ i ].cost;
        }

        const stagedTransactions = this.stagedTransactions;
        for ( let i in stagedTransactions ) {
            cost += stagedTransactions [ i ].cost;
        }

        return this.accountInfo.balance - cost - this.nextTransactionCost;
    }

    //----------------------------------------------------------------//
    @computed get
    canClearTransactions () {

        if ( !this.hasAccount ) return false;
        return (( this.account.stagedTransactions.length > 0 ) || ( this.account.pendingTransactions.length > 0 ));
    }

    //----------------------------------------------------------------//
    @computed get
    canSubmitTransactions () {

        if ( !this.hasAccount ) return false;
        if ( this.nonce < 0 ) return false;

        if ( this.stagedTransactions.length > 0 ) return true;
        if (( this.pendingTransactions.length > 0 ) && ( this.hasTransactionError )) return true;

        return false;
    }

    //----------------------------------------------------------------//
    checkTransactionEntitlements ( transactionType ) {

        const account = this.account;
        if ( account ) {
            for ( let keyName in account.keys ) {
                const key = account.keys [ keyName ];
                if ( key.entitlements && entitlements.check ( key.entitlements.policy, transactionType )) return true;
            }
        }
        return false;
    }

    //----------------------------------------------------------------//
    @action
    clearPendingTransactions () {

        if ( this.hasAccount ) {
            this.account.pendingTransactions = [];
            this.account.transactionError = false;
        }
    }

    //----------------------------------------------------------------//
    @action
    clearStagedTransactions () {

        if ( this.hasAccount ) {
            this.account.stagedTransactions = [];
        }
    }

    //----------------------------------------------------------------//
    constructor ( networkID, accountID ) {
        super ( networkID );

        runInAction (() => {

            if ( _.has ( this.network.accounts, accountID )) {
                this.accountID = accountID;
            }
            else {
                throw new Error ( 'Account not found.' );
            }
        });

        this.setAccountInfo ();
        this.processTransactionsAsync ();

        this.accountInfoService     = new AccountInfoService ( this );
        this.inventoryProgress      = new ProgressController ();
        this.inventory              = new InventoryController ( this.inventoryProgress );
        this.inventoryService       = new InventoryService ( this, this.inventory, this.inventoryProgress );
        this.inventoryTags          = new InventoryTagsController ();
    }

    //----------------------------------------------------------------//
    @action
    deleteTransactions () {

        if ( this.hasAccount ) {
            this.account.pendingTransactions = [];
            this.account.stagedTransactions = [];
        }
    }

    //----------------------------------------------------------------//
    finalize () {

        this.accountInfoService.finalize ();
        this.inventoryProgress.finalize ();
        this.inventory.finalize ();
        this.inventoryService.finalize ();
        this.inventoryTags.finalize ();

        super.finalize ();
    }

    //----------------------------------------------------------------//
    getDefaultAccountKeyName () {

        const defaultKeyName = 'master';
        const accountKeyNames = this.accountKeyNames;
        if ( accountKeyNames.includes ( defaultKeyName )) return defaultKeyName;
        return (( accountKeyNames.length > 0 ) && accountKeyNames [ 0 ]) || '';
    }

    //----------------------------------------------------------------//
    getKey ( keyName ) {
        const account = this.getAccount ();
        return account ? account.keys [ keyName || this.getDefaultAccountKeyName ()] : null;
    }

    //----------------------------------------------------------------//
    getKeyNamesForTransaction ( transactionType ) {

        const keyNames = [];

        const account = this.account;
        if ( account ) {
            for ( let keyName in account.keys ) {
                const key = account.keys [ keyName ];
                if ( entitlements.check ( key.entitlements.policy, transactionType )) {
                    keyNames.push ( keyName );
                }
            }
        }
        return keyNames;
    }

    //----------------------------------------------------------------//
    getPrivateKeyInfo ( keyName, password ) {

        if ( this.checkPassword ( password )) {

            try {
                const key = this.account.keys [ keyName ];

                return {
                    phraseOrKey:    crypto.aesCipherToPlain ( key.phraseOrKeyAES, password ),
                    privateKeyHex:  crypto.aesCipherToPlain ( key.privateKeyHexAES, password ),
                }
            }
            catch ( error ) {
                console.log ( error );
            }
        }
        return false;
    }

    //----------------------------------------------------------------//
    @computed get
    hasAccount () {
        return ( this.accountID && this.account );
    }

    //----------------------------------------------------------------//
    @computed get
    hasAccountInfo () {
        return ( this.accountInfo !== false );
    }

    //----------------------------------------------------------------//
    @computed get
    hasTransactionError () {
        return this.transactionError !== false;
    }

    //----------------------------------------------------------------//
    @computed get
    inventoryNonce () {
        return this.account.inventoryNonce || 0;
    }

    //----------------------------------------------------------------//
    @computed get
    nonce () {
        return this.accountInfo.nonce;
    }

    //----------------------------------------------------------------//
    @computed get
    pendingTransactions () {
        return this.account.pendingTransactions;
    }

    //----------------------------------------------------------------//
    @action
    async processTransactionsAsync () {

        if ( !this.hasAccount ) return;

        if ( !this.hasTransactionError ) {

            let pendingTransactions = this.pendingTransactions;
            let more = pendingTransactions.length > 0;
            
            while ( more && ( pendingTransactions.length > 0 )) {

                more = false;

                const memo          = pendingTransactions [ 0 ];
                const accountName   = memo.body.maker.accountName;
                
                try {

                    const url = `${ this.network.nodeURL }/accounts/${ accountName }/transactions/${ memo.uuid }`;
                    const checkResult = await this.revocable.fetchJSON ( url );

                    switch ( checkResult.status ) {

                        case 'ACCEPTED':
                            runInAction (() => {
                                pendingTransactions.shift ();
                            });
                            more = true;
                            break;

                        case 'REJECTED':
                            runInAction (() => {
                                this.account.transactionError = {
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

        this.revocable.timeout (() => { this.processTransactionsAsync ()}, 5000 );
    }

    //----------------------------------------------------------------//
    @action
    pushTransaction ( transaction ) {

        this.assertHasAccount ();

        let memo = {
            type:               transaction.type,
            note:               transaction.note,
            cost:               transaction.getCost (),
            body:               transaction.body,
            assets:             transaction.assetsUtilized,
            uuid:               util.generateUUIDV4 (),
        }

        this.account.stagedTransactions.push ( memo );
        this.setNextTransactionCost ( 0 );
        this.flags.promptFirstTransaction = false;
    }

    //----------------------------------------------------------------//
    async putTransactionAsync ( memo ) {

        const accountName   = memo.body.maker.accountName;
        const url           = `${ this.network.nodeURL }/accounts/${ accountName }/transactions/${ memo.uuid }`;

        const result = await this.revocable.fetchJSON ( url, {
            method :    'PUT',
            headers :   { 'content-type': 'application/json' },
            body :      JSON.stringify ( memo.envelope, null, 4 ),
        });
        return ( result.status === 'RETRY' );
    }

    //----------------------------------------------------------------//
    @action
    renameAccount ( oldName, newName ) {

        super.renameAccount ( oldName, newName );

        if ( this.accountID === oldName ) {
            this.accountID = newName;
        }
    }

    //----------------------------------------------------------------//
    @action
    setAccountInfo ( accountInfo ) {

        if ( accountInfo ) {

            if ( !this.accountInfo ) {
                this.accountInfo = {};
            }

            this.accountInfo.balance            = accountInfo.balance;
            this.accountInfo.nonce              = accountInfo.nonce;
            this.accountInfo.inventoryNonce     = accountInfo.inventoryNonce;
            this.accountInfo.height             = accountInfo.height || 0;
        }
        else {
            this.accountInfo = false;
        }
    }

    //----------------------------------------------------------------//
    @action
    setAccountInventoryNonce ( inventoryNonce ) {

        this.account.inventoryNonce = inventoryNonce;
    }

    //----------------------------------------------------------------//
    @action
    setNextTransactionCost ( cost ) {

        this.nextTransactionCost = cost || 0;
    }

    //----------------------------------------------------------------//
    @computed get
    transactionError () {
        return this.account.transactionError || false;
    }

    //----------------------------------------------------------------//
    @computed get
    stagedTransactions () {
        return this.account.stagedTransactions;
    }

    //----------------------------------------------------------------//
    @action
    async submitTransactions ( password ) {

        this.assertHasAccount ();
        this.assertPassword ( password );

        let stagedTransactions      = this.account.stagedTransactions;
        let pendingTransactions     = this.account.pendingTransactions;

        try {

            const queue = [];
            const currentNonce = this.nonce;

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

                const hexKey            = this.account.keys [ body.maker.keyName ];
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
                this.account.stagedTransactions     = queue;
                this.account.pendingTransactions    = submitted;
                this.account.transactionError       = false; // OK to clear the transaction error no.
            });
        }
        catch ( error ) {
             console.log ( 'AN ERROR!', error );
        }
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
