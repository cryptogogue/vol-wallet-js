// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AccountStateService }          from './AccountStateService';
import { AppStateService }              from './AppStateService';
import { ConsensusService }             from './ConsensusService';
import { InventoryController }          from 'cardmotron';
import { assert, crypto, excel, ProgressController, randomBytes, RevocableContext, SingleColumnContainerView, storage, StorageContext, util } from 'fgc';
import * as bcrypt                      from 'bcryptjs';
import _                                from 'lodash';
import { action, computed, extendObservable, observable, observe, reaction, runInAction } from 'mobx';
import React                            from 'react';
import url                              from 'url';
import { vol }                          from 'vol';

//const debugLog = function () {}
const debugLog = function ( ...args ) { console.log ( '@NETWORK SERVICE:', ...args ); }

//================================================================//
// NetworkStateService
//================================================================//
export class NetworkStateService {

    @observable accounts        = {};
    @observable networkID       = '';
    @observable minersByID      = {};
    @observable ignoreURLs      = {};

    @computed get accountIndices        () { return this.network.accountIndices; }
    @computed get accountIDsByIndex     () { return this.network.accountIDsByIndex; }
    @computed get digest                () { return this.consensusService.digest || ''; }
    @computed get genesis               () { return this.consensusService.genesis || ''; }
    @computed get height                () { return this.consensusService.height; }
    @computed get identity              () { return this.consensusService.identity; }
    @computed get isCurrent             () { return this.consensusService.isCurrent; }
    @computed get isOnline              () { return this.consensusService.isOnline; }
    @computed get nodeURL               () { return this.network.nodeURL; }
    @computed get pendingAccounts       () { return this.network.pendingAccounts; }    

    //----------------------------------------------------------------//
    @action
    affirmAccountAndKey ( password, accountIndex, accountID, keyName, phraseOrKey, privateKeyHex, publicKeyHex ) {

        debugLog ( 'AFFIRM ACCOUNT', accountIndex, accountID, keyName );

        if ( password ) {
            this.appState.assertPassword ( password );
        }

        let account = this.accounts [ accountID ] || new AccountStateService ( this, accountIndex, accountID );

        let key = account.keys [ keyName ] || {};

        key.phraseOrKeyAES      = password ? crypto.aesPlainToCipher ( phraseOrKey, password ) : phraseOrKey;
        key.privateKeyHexAES    = password ? crypto.aesPlainToCipher ( privateKeyHex, password ) : privateKeyHex;
        key.publicKeyHex        = publicKeyHex;

        account.keys [ keyName ] = key;

        this.accounts [ accountID ]                 = account;
        this.accountIDsByIndex [ accountIndex ]     = accountID;

        if ( !this.accountIndices.includes ( accountIndex )) {
            this.accountIndices.push ( accountIndex );
        }
    }

    //----------------------------------------------------------------//
    @action
    assertAccountService ( accountID ) {

        if ( !this.hasAccount ( accountID )) throw new Error ( `Account not found: ${ accountID }` );
        return this.accounts [ accountID ];
    }

    //----------------------------------------------------------------//
    constructor ( appState, networkID, consensusService ) {

        assert ( appState );

        this.appState       = appState;
        this.revocable      = new RevocableContext ();
        this.storage        = new StorageContext ();

        runInAction (() => {
            this.networkID = networkID;
        });

        const storageKey = `.vol.NETWORK.${ networkID }`;

        if ( consensusService ) {

            assert ( consensusService.isOnline );

            const network = {

                accountIndices:     [],
                accountIDsByIndex:  {},
                pendingAccounts:    {},

                nodeURL:            consensusService.onlineURLs [ 0 ],
                minerURLs:          consensusService.onlineURLs,
                identity:           consensusService.identity,
                genesis:            consensusService.genesis,
                height:             consensusService.height,
                digest:             consensusService.digest,
            };

            storage.removeItem ( storageKey );
            this.storage.persist ( this, 'network',     storageKey,     network );
        }
        else {

            this.storage.persist ( this, 'network',     storageKey );

            assert ( this.network && this.network.identity && this.network.genesis );

            consensusService = new ConsensusService ();
            consensusService.initialize (
                this.network.identity,
                this.network.genesis,
                this.network.height,
                this.network.digest,
                this.network.minerURLs.concat ([ this.network.nodeURL ])
            );
        }

        this.consensusService = consensusService;

        for ( let accountIndex of this.accountIndices ) {

            const accountID = this.accountIDsByIndex [ accountIndex ];
            if ( accountID === undefined ) continue;

            debugLog ( 'loading account', accountID );
            const account = new AccountStateService ( this, accountIndex, accountID );
            this.accounts [ accountID ] = account;
        }

        this.startServiceLoopAsync ();
    }

    //----------------------------------------------------------------//
    @action
    deleteAccount ( accountID ) {

        debugLog ( 'DELETING ACCOUNT:', accountID );

        const account = this.accounts [ accountID ];
        if ( !account ) return;

        this.accountIndices.splice ( this.accountIndices.indexOf ( account.index ), 1 );

        delete this.accountIDsByIndex [ account.index ];
        delete this.accounts [ accountID ];

        account.deleteAccount ();
    }

    //----------------------------------------------------------------//
    @action
    deleteAccountRequest ( requestID ) {

        delete this.pendingAccounts [ requestID ];
    }

    //----------------------------------------------------------------//
    @action
    deleteNetwork () {

        if ( this.networkID ) {
            
            debugLog ( 'deleting network', this.networkID );
            
            this.revocable.revokeAll ();

            for ( let accountID in this.accounts ) {
                this.deleteAccount ( accountID );
            }

            this.storage.remove ( this, 'network' );
            this.appState.appDB.deleteNetworkAsync ( this.networkID );
            this.networkID = false;

            this.finalize ();
        }
    }

    //----------------------------------------------------------------//
    finalize () {

        for ( let accountID in this.accounts ) {
            this.accounts [ accountID ].finalize ();
        }

        this.consensusService.finalize ();
        this.revocable.finalize ();
        this.storage.finalize ();
    }

    //----------------------------------------------------------------//
    findAccountIdByPublicKey ( publicKey ) {

        if ( this.hasNetwork ) {
            for ( let accountID in this.accounts ) {
                const account = this.accounts [ accountID ];
                for ( let keyName in account.keys ) {
                    const key = account.keys [ keyName ];
                    if ( key.publicKey === publicKey ) return accountID;
                }
            }
        }
        return false;
    }

    //----------------------------------------------------------------//
    formatServiceURL ( base, path, query, mostCurrent ) {

        return this.consensusService.formatServiceURL ( base, path, query, mostCurrent );
    }

    //----------------------------------------------------------------//
    getAccount ( accountID ) {

        return _.has ( this.accounts, accountID ) ? this.accounts [ accountID ] : false;
    }

    //----------------------------------------------------------------//
    getPrimaryURL ( path, query, mostCurrent ) {
        return this.consensusService.formatServiceURL ( this.network.nodeURL, path, query, mostCurrent );
    }

    //----------------------------------------------------------------//
    getServiceURL ( path, query, mostCurrent ) {

        debugLog ( 'getServiceURL' );

        const onlineURLs = this.consensusService.onlineURLs;

        if (( onlineURLs.length === 0 ) || onlineURLs.includes ( this.network.nodeURL )) {
            debugLog ( 'getServiceURL: all miners are offline OR primary node is online', onlineURLs.length );
            return this.getPrimaryURL ( path, query, mostCurrent );
        }
        debugLog ( 'getServiceURL: picking at random' );
        return this.consensusService.getServiceURL ( path, query, mostCurrent );
    }

    //----------------------------------------------------------------//
    getServiceURLs ( path, query, mostCurrent ) {

        return this.consensusService.getServiceURLs ( path, query, mostCurrent );
    }

    //----------------------------------------------------------------//
    @action
    hasAccount ( accountID ) {

        return _.has ( this.accounts, accountID );
    }

    //----------------------------------------------------------------//
    @computed get
    hasNetwork () {

        return ( this.networkID && this.network );
    }

    //----------------------------------------------------------------//
    @action
    importAccountRequest ( requestID, accountIndex, accountID, keyName ) {

        if ( !_.has ( this.pendingAccounts, requestID )) return;

        let request = this.pendingAccounts [ requestID ];

        this.affirmAccountAndKey (
            false,
            accountIndex,
            accountID,
            keyName,
            request.phraseOrKeyAES,
            request.privateKeyHexAES,
            request.publicKeyHex,
        );
        delete this.pendingAccounts [ requestID ];
    }

    //----------------------------------------------------------------//
    @action
    renameAccount ( oldName, newName ) {

        if ( oldName === newName ) return;
        if ( !_.has ( this.accounts, oldName )) return;        
        
        const account = this.accounts [ oldName ];
        if ( !account ) return;

        this.accountIDsByIndex [ account.index ] = newName;
        this.accounts [ newName ] = account;
        delete this.accounts [ oldName ];
    }

    //----------------------------------------------------------------//
    async startServiceLoopAsync () {

        // await this.revocable.allFromMap ( this.accounts, account => account.startServiceLoopAsync ());

        this.serviceLoopAsync ();
    }

    //----------------------------------------------------------------//
    async serviceLoopAsync () {

        let count = this.serviceLoopCount || 0;
        debugLog ( 'SERVICE LOOP RUN:', count );
        this.serviceLoopCount = count + 1;

        await this.consensusService.discoverMinersAsync ();
        await this.consensusService.updateMinersAsync ();

        let timeout = 5000;
        if ( this.consensusService.onlineMiners.length ) {

            await this.consensusService.updateConsensus ();

            runInAction (() => {
                this.network.height         = this.height;
                this.network.digest         = this.digest;
                this.network.minerURLs      = this.consensusService.onlineURLs;
            });

            timeout = this.consensusService.isCurrent ? 15000 : 1;
        }
        debugLog ( 'Next update in...', timeout );
        this.revocable.timeout (() => { this.serviceLoopAsync ()}, timeout );
    }

    //----------------------------------------------------------------//
    @action
    setAccountRequest ( password, phraseOrKey, keyID, privateKeyHex, publicKeyHex ) {

        this.appState.assertPassword ( password );

        this.appState.flags.promptFirstAccount = false;

        const phraseOrKeyAES = crypto.aesPlainToCipher ( phraseOrKey, password );
        if ( phraseOrKey !== crypto.aesCipherToPlain ( phraseOrKeyAES, password )) throw new Error ( 'AES error' );

        const privateKeyHexAES = crypto.aesPlainToCipher ( privateKeyHex, password );
        if ( privateKeyHex !== crypto.aesCipherToPlain ( privateKeyHexAES, password )) throw new Error ( 'AES error' );

        let requestID;
        do {
            requestID = `vol_${ randomBytes ( 6 ).toString ( 'hex' )}`;
        } while ( _.has ( this.pendingAccounts, requestID ));

        const encoded = vol.encodeAccountRequest ( this.genesis, publicKeyHex );

        const pendingAccount = {
            requestID:              requestID,
            encoded:                encoded,
            keyID:                  keyID, // needed to recover account later
            publicKeyHex:           publicKeyHex,
            privateKeyHexAES:       privateKeyHexAES,
            phraseOrKeyAES:         phraseOrKeyAES,
            readyToImport:          false,
        }

        this.pendingAccounts [ requestID ] = pendingAccount;
    }
}
