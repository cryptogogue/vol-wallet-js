// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as entitlements                from '../util/entitlements';
import { AccountInfoService }           from './AccountInfoService';
import { NetworkStateService }          from './NetworkStateService';
import { InventoryService }             from './InventoryService';
import { InventoryTagsController }      from './InventoryTagsController';
import { TransactionQueueService }      from './TransactionQueueService';
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

        let assetsUtilized = this.account.assetsSent ? Object.keys ( this.account.assetsSent ) : [];
        return assetsUtilized.concat ( this.transactionQueue.assetsUtilized );
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

        this.accountInfoService     = new AccountInfoService ( this );
        this.inventoryProgress      = new ProgressController ();
        this.inventory              = new InventoryController ( this.inventoryProgress );
        this.inventoryService       = new InventoryService ( this, this.inventory, this.inventoryProgress );
        this.inventoryTags          = new InventoryTagsController ();
        this.transactionQueue       = new TransactionQueueService ( this );

        this.serviceLoop ();
    }

    //----------------------------------------------------------------//
    finalize () {

        this.accountInfoService.finalize ();
        this.inventoryProgress.finalize ();
        this.inventory.finalize ();
        this.inventoryService.finalize ();
        this.inventoryTags.finalize ();
        this.transactionQueue.finalize ();

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
    inventoryNonce () {
        return this.account.inventoryNonce || 0;
    }

    //----------------------------------------------------------------//
    @computed get
    nonce () {
        return this.accountInfo.nonce;
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
    async serviceLoop () {

        let timeout = 5000;

        await this.accountInfoService.syncAccountInfo ();

        if ( this.transactionQueue.pendingTransactions.length > 0 ) {
            await this.transactionQueue.processTransactionsAsync ();
        }
        else {
            await this.inventoryService.serviceStep ();
        }
        this.revocable.timeout (() => { this.serviceLoop ()}, timeout );
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
