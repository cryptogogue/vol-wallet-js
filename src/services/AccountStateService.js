// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as entitlements                from '../util/entitlements';
import { NetworkStateService }          from './NetworkStateService';
import { InventoryService }             from './InventoryService';
import { InventoryTagsController }      from './InventoryTagsController';
import { TransactionQueueService }      from './TransactionQueueService';
import * as bitcoin                     from 'bitcoinjs-lib';
import { InventoryController }          from 'cardmotron';
import { assert, crypto, excel, ProgressController, randomBytes, RevocableContext, SingleColumnContainerView, StorageContext, util } from 'fgc';
import * as bcrypt                      from 'bcryptjs';
import _                                from 'lodash';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import React                            from 'react';

//const debugLog = function () {}
const debugLog = function ( ...args ) { console.log ( '@ACCOUNT STATE:', ...args ); }

//================================================================//
// AccountStateService
//================================================================//
export class AccountStateService {

    @observable index           = false;
    @observable accountID       = false;
    @observable accountInfo     = false;

    @computed get accountKeyNames           () { return ( this.account && Object.keys ( this.account.keys )) || []; }
    @computed get balance                   () { return this.accountInfo.balance - this.transactionQueue.cost; }
    @computed get controlKey                () { return this.account.controlKey; }
    @computed get inventoryNonce            () { return this.inventoryService.nonce; }
    @computed get isMiner                   () { return Boolean ( this.minerInfo ); }
    @computed get keys                      () { return this.account.keys; }
    @computed get minerInfo                 () { return this.account.minerInfo || false; }
    @computed get network                   () { return this.networkService; }
    @computed get networkID                 () { return this.networkService.networkID; }
    @computed get nonce                     () { return this.accountInfo.nonce || 0; }
    @computed get serverInventoryNonce      () { return this.inventoryService.serverNonce; }

    //----------------------------------------------------------------//
    @action
    affirmMinerControlKey ( password, phraseOrKey, privateKeyHex, publicKeyHex ) {

        if ( password ) {
            this.appState.assertPassword ( password );
        }

        let key = {};

        key.phraseOrKeyAES      = password ? crypto.aesPlainToCipher ( phraseOrKey, password ) : phraseOrKey;
        key.privateKeyHexAES    = password ? crypto.aesPlainToCipher ( privateKeyHex, password ) : privateKeyHex;
        key.publicKeyHex        = publicKeyHex;

        this.account.controlKey = key;
    }

    //----------------------------------------------------------------//
    @computed get
    assetsUtilized () {

        let assetsUtilized = this.account.assetsSent ? Object.keys ( this.account.assetsSent ) : [];
        return assetsUtilized.concat ( this.transactionQueue.assetsUtilized );
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
    constructor ( networkService, accountIndex, accountID ) {

        debugLog ( 'NETWORK SERVICE:', networkService );

        assert ( networkService );
        assert ( networkService.appState, 'Missing networkService.appState' );

        this.appState           = networkService.appState;
        this.networkService     = networkService;
        this.revocable          = new RevocableContext ();
        this.storage            = new StorageContext ();

        runInAction (() => {
            this.index          = accountIndex;
            this.accountID      = accountID;
        });

        const accountInit = {
            keys: {},
            pendingTransactions: [],
            stagedTransactions: [],
            transactionError: false,
        };

        this.storage.persist ( this, 'account',     `.vol.NETWORK.${ networkService.networkID }.ACCOUNT.${ accountIndex }`,       accountInit );

        this.inventoryProgress      = new ProgressController ();
        this.inventory              = new InventoryController ( this.inventoryProgress );
        this.inventoryService       = new InventoryService ( this, this.inventory, this.inventoryProgress );
        this.inventoryTags          = new InventoryTagsController ();
        this.transactionQueue       = new TransactionQueueService ( this );

        this.serviceLoop ();
    }

    //----------------------------------------------------------------//
    deleteAccount () {

        this.storage.remove ( this, 'account' );
        this.appState.appDB.deleteAccountAsync ( this.networkID, this.accountID );
        this.finalize ();
    }

    //----------------------------------------------------------------//
    @action
    deleteMinerControlKey () {

        delete this.account.controlKey;
    }

    //----------------------------------------------------------------//
    finalize () {

        this.inventoryProgress.finalize ();
        this.inventory.finalize ();
        this.inventoryService.finalize ();
        this.inventoryTags.finalize ();
        this.transactionQueue.finalize ();

        this.revocable.finalize ();
        this.storage.finalize ();
    }

    //----------------------------------------------------------------//
    getDefaultAccountKeyName () {

        const defaultKeyName = 'master';
        const accountKeyNames = this.accountKeyNames;
        if ( accountKeyNames.includes ( defaultKeyName )) return defaultKeyName;
        return (( accountKeyNames.length > 0 ) && accountKeyNames [ 0 ]) || '';
    }

    //----------------------------------------------------------------//
    getFeeSchedule () {
        
        return this.account.feeSchedule || {};
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
    getMinimumGratuity () {
        
        return this.account.minGratuity || 0;
    }

    //----------------------------------------------------------------//
    getPrivateKeyInfo ( keyName, password ) {

        if ( this.appState.checkPassword ( password )) {

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
    @action
    renameAccount ( oldName, newName ) {

        this.networkService.renameAccount ( oldName, newName );
        this.accountID = newName;
    }

    //----------------------------------------------------------------//
    @action
    async serviceLoop () {

        debugLog ( 'SERVICE LOOP' );

        let timeout = 5000;

        await this.syncAccountInfo ();

        if ( this.transactionQueue.pendingTransactions.length > 0 ) {
            debugLog ( 'PROCESS TRANSACTIONS' );
            await this.transactionQueue.processTransactionsAsync ();
        }
        else {
            debugLog ( 'UPDATE INVENTORY' );
            const more = await this.inventoryService.serviceStep ();
            if ( more ) {
                debugLog ( 'SERVICE LOOP: MORE' );
                timeout = 1;
            }
        }
        this.revocable.timeout (() => { this.serviceLoop ()}, timeout );
    }

    //----------------------------------------------------------------//
    @action
    setAccountInfo ( accountInfo ) {

        debugLog ( 'setAccountInfo', accountInfo );

        if ( accountInfo ) {

            if ( !this.accountInfo ) {
                this.accountInfo = {};
            }

            this.accountInfo.balance            = accountInfo.balance;
            this.accountInfo.nonce              = accountInfo.nonce;
            this.accountInfo.height             = accountInfo.height || 0;
        }
        else {
            this.accountInfo = false;
        }
    }

    //----------------------------------------------------------------//
    async syncAccountInfo () {

        debugLog ( 'syncAccountInfo', this.accountID );

        if ( this.accountID.length === 0 ) return;

        try {

            const accountID = this.accountID;            
            let data = await this.revocable.fetchJSON ( this.networkService.getServiceURL ( `/accounts/${ accountID }` ));

            debugLog ( 'account response:', data );

            if ( !data.account ) {

                debugLog ( 'looking up account by key' );

                const key = Object.values ( this.account.keys )[ 0 ];
                const keyID = bitcoin.crypto.sha256 ( key.publicKeyHex ).toString ( 'hex' ).toLowerCase ();
                data = await this.revocable.fetchJSON ( this.networkService.getServiceURL ( `/keys/${ keyID }/account` ));

                debugLog ( 'account response by key:', data );
            }

            const accountInfo = data.account;

            if ( accountInfo ) {

                debugLog ( 'accountInfo', accountInfo );

                this.setAccountInfo ( accountInfo );
                this.updateAccount (
                    accountInfo,
                    data.miner,
                    data.entitlements,
                    data.feeSchedule,
                    data.minGratuity
                );

                if ( accountInfo.name !== accountID ) {
                    this.renameAccount ( accountID, accountInfo.name );
                }
            }
        }
        catch ( error ) {
            debugLog ( 'AN ERROR!' );
            debugLog ( error );
            this.setAccountInfo ();
        }
    }

    //----------------------------------------------------------------//
    @action
    updateAccount ( accountInfo, minerInfo, entitlements, feeSchedule, minGratuity ) {

        let account = this.account;
        if ( !account ) return;

        account.minerInfo       = minerInfo;
        account.policy          = accountInfo.policy;
        account.bequest         = accountInfo.bequest;
        account.entitlements    = entitlements.account;
        account.feeSchedule     = feeSchedule || {};
        account.minGratuity     = minGratuity || 0;

        for ( let keyName in accountInfo.keys ) {

            let key = account.keys [ keyName ];
            if ( !key ) continue;

            let keyUpdate = accountInfo.keys [ keyName ];
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
