// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as entitlements                from '../util/entitlements';
import { NetworkStateService }          from './NetworkStateService';
import { InventoryService }             from './InventoryService';
import { InventoryTagsController }      from './InventoryTagsController';
import { TransactionQueueService }      from './TransactionQueueService';
import * as bitcoin                     from 'bitcoinjs-lib';
import { Inventory }                    from 'cardmotron';
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

    @observable accountID           = false;
    @observable index               = false;
    @observable hasAccountInfo      = false;

    @computed get accountKeyNames           () { return ( this.account && Object.keys ( this.account.keys )) || []; }
    @computed get balance                   () { return this.account.balance - this.transactionQueue.cost; }
    @computed get controlKey                () { return this.account.controlKey; }
    @computed get inboxRead                 () { return this.account.inboxRead || 0; }
    @computed get inventoryNonce            () { return this.inventoryService.nonce; }
    @computed get isMiner                   () { return Boolean ( this.minerInfo ); }
    @computed get keys                      () { return this.account.keys; }
    @computed get minerInfo                 () { return this.account.minerInfo || false; }
    @computed get network                   () { return this.networkService; }
    @computed get networkID                 () { return this.networkService.networkID; }
    @computed get nonce                     () { return this.account.nonce || 0; }

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
    assetsFiltered () {

        const assetsFiltered = this.account.assetsFiltered ? _.cloneDeep ( this.account.assetsFiltered ) : {};
        for ( let assetID in this.transactionQueue.assetsFiltered ) {
            assetsFiltered [ assetID ] = this.transactionQueue.assetsFiltered [ assetID ];
        }
        return assetsFiltered;
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
        debugLog ( 'NETWORK HEIGHT:', networkService.height );

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
            transactionError: false, // TODO: move me to transaction queue service
        };

        this.storage.persist ( this, 'account',     `.vol.NETWORK.${ networkService.networkID }.ACCOUNT.${ accountIndex }`,       accountInit );

        this.inventoryProgress      = new ProgressController ();
        this.inventory              = new Inventory ( this.inventoryProgress );
        this.inventoryService       = new InventoryService ( this, this.inventory, this.inventoryProgress );
        this.inventoryTags          = new InventoryTagsController ();
        this.transactionQueue       = new TransactionQueueService ( this );

        this.startServiceLoopAsync ();
    }

    //----------------------------------------------------------------//
    deleteAccount () {

        this.storage.remove ( this, 'account' );
        this.appState.appDB.deleteAccountAsync ( this.networkID, this.index );
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
    @action
    renameAccount ( oldName, newName ) {

        this.networkService.renameAccount ( oldName, newName );
        this.accountID = newName;
    }

    //----------------------------------------------------------------//
    @action
    async startServiceLoopAsync () {

        debugLog ( 'START SERVICE LOOP' );
        await this.transactionQueue.loadAsync ();
        this.serviceLoopAsync ();
    }

    //----------------------------------------------------------------//
    @action
    async serviceLoopAsync () {

        debugLog ( 'SERVICE LOOP' );

        let timeout = 5000;

        await this.syncAccountInfoAsync ();

        await this.transactionQueue.tagLostTransactionsAsync ( this.nonce );
        await this.transactionQueue.processTransactionsAsync ();

        if ( this.transactionQueue.pendingTransactions.length === 0 ) {
            debugLog ( 'UPDATE INVENTORY' );
            const more = await this.inventoryService.serviceStep ();
            if ( more ) {
                debugLog ( 'SERVICE LOOP: MORE' );
                timeout = 1;
            }
        }
        this.revocable.timeout (() => { this.serviceLoopAsync ()}, timeout );
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
    @action
    setInboxRead ( inboxRead ) {

        this.account.inboxRead = inboxRead;
    }

    //----------------------------------------------------------------//
    async syncAccountInfoAsync () {

        debugLog ( 'syncAccountInfoAsync', this.accountID );

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

            if ( data.account ) {
                this.updateAccount ( data );
            }
        }
        catch ( error ) {
            debugLog ( 'AN ERROR!' );
            debugLog ( error );
        }
    }

    //----------------------------------------------------------------//
    @action
    updateAccount ( data ) {

        const accountInfo       = data.account;
        const entitlements      = data.entitlements;
        const account           = this.account;

        account.balance         = accountInfo.balance;
        account.nonce           = accountInfo.nonce;

        account.minerInfo       = data.miner;
        account.policy          = accountInfo.policy;
        account.bequest         = accountInfo.bequest;
        account.entitlements    = entitlements.account;
        account.feeSchedule     = data.feeSchedule || false; // TODO: move to network
        account.minGratuity     = data.minGratuity || 0; // TODO: move to network

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

        if ( accountInfo.name !== this.accountID ) {
            this.renameAccount ( this.accountID, accountInfo.name );
        }

        this.hasAccountInfo = true;
    }
}
