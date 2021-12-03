// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as AppDB                       from './AppDB';
import * as entitlements                from '../util/entitlements';
import { InventoryService }             from './InventoryService';
import { InventoryTagsController }      from './InventoryTagsController';
import { TransactionQueueService }      from './TransactionQueueService';
import * as bitcoin                     from 'bitcoinjs-lib';
import { Inventory }                    from 'cardmotron';
import { assert, crypto, hooks, ProgressController, RevocableContext, StorageContext } from 'fgc';
import _                                from 'lodash';
import { action, computed, observable, runInAction } from 'mobx';

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

        return this.transactionQueue.assetsFiltered;
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
        this.inventoryTags          = new InventoryTagsController ( networkService.networkID );
        this.transactionQueue       = new TransactionQueueService ( this );

        this.startServiceLoopAsync ();
    }

    //----------------------------------------------------------------//
    deleteAccount () {

        this.storage.remove ( this, 'account' );
        AppDB.deleteAccountAsync ( this.networkID, this.index );
        hooks.finalize ( this );
    }

    //----------------------------------------------------------------//
    @action
    deleteMinerControlKey () {

        delete this.account.controlKey;
    }

    //----------------------------------------------------------------//
    finalize () {

        hooks.finalize ( this.inventoryProgress );
        hooks.finalize ( this.inventory );
        hooks.finalize ( this.inventoryService );
        hooks.finalize ( this.inventoryTags );
        hooks.finalize ( this.transactionQueue );
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
    async getKeyPairAsync ( keyName, password ) {

        const hexKey            = this.account.keys [ keyName];
        const privateKeyHex     = crypto.aesCipherToPlain ( hexKey.privateKeyHexAES, password );
        const key               = await crypto.keyFromPrivateHex ( privateKeyHex );

        return key;
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

        try {

            debugLog ( 'LOADED SUB-SERVICES' );

            await this.syncAccountInfoAsync ();

            await this.transactionQueue.loadAsync ();
            await this.inventoryService.loadAsync ();

            debugLog ( 'START SERVICE LOOP' );
            this.serviceLoopAsync ();
        }
        catch ( error ) {
            debugLog ( error );
        }   
    }

    //----------------------------------------------------------------//
    @action
    async serviceLoopAsync () {

        try {

            await this.syncAccountInfoAsync ();
            await this.inventoryService.serviceStepAsync ();
            await this.transactionQueue.serviceStepAsync ();

            this.revocable.timeout (() => { this.serviceLoopAsync ()}, 5000 );
        }
        catch ( error ) {
            debugLog ( error );
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
