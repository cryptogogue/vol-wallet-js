// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AccountStateService }          from './AccountStateService';
import * as AppDB                       from './AppDB';
import { assert, crypto, hooks, randomBytes, RevocableContext, storage, StorageContext } from 'fgc';
import _                                from 'lodash';
import { action, computed, observable, runInAction } from 'mobx';
import * as vol                         from 'vol';

//const debugLog = function () {}
const debugLog = function ( ...args ) { console.log ( '@NETWORK SERVICE:', ...args ); }

//================================================================//
// NetworkStateService
//================================================================//
export class NetworkStateService {

    @observable accounts                = {};
    @observable consensusService        = false;
    @observable ignoreURLs              = {};
    @observable minersByID              = {};
    @observable networkID               = '';

    @computed get accountIndices        () { return this.network.accountIndices; }
    @computed get accountIDsByIndex     () { return this.network.accountIDsByIndex; }
    @computed get digest                () { return this.consensusService.digest || ''; }
    @computed get favoriteOffers        () { return this.network.favoriteOffers || []; }
    @computed get genesis               () { return this.consensusService.genesis || ''; }
    @computed get height                () { return this.consensusService.height; }
    @computed get identity              () { return this.consensusService.identity; }
    @computed get isOnline              () { return this.consensusService.isOnline; }
    @computed get marketplaceURL        () { return this.network.marketplaceURL || false; }
    @computed get nodeURL               () { return this.network.nodeURL; }
    @computed get pendingAccounts       () { return this.network.pendingAccounts; }

    //----------------------------------------------------------------//
    @action
    affirmAccountAndKey ( password, accountIndex, accountID, keyName, phraseOrKey, privateKeyHex, publicKeyHex ) {

        debugLog ( 'AFFIRM ACCOUNT', accountIndex, accountID, keyName );

        if ( password ) {
            this.appState.assertPassword ( password );
        }

        const account = this.accounts [ accountID ] || new AccountStateService ( this, accountIndex, accountID );
        
        const key = account.keys [ keyName ] || {};

        key.phraseOrKeyAES      = password ? crypto.aesPlainToCipher ( phraseOrKey, password ) : phraseOrKey;
        key.privateKeyHexAES    = password ? crypto.aesPlainToCipher ( privateKeyHex, password ) : privateKeyHex;
        key.publicKeyHex        = publicKeyHex;

        account.keys [ keyName ] = key;

        this.accounts [ accountID ]                 = account;
        this.accountIDsByIndex [ accountIndex ]     = accountID;

        if ( !this.accountIndices.includes ( accountIndex )) {
            this.accountIndices.push ( accountIndex );
        }
        account.startServiceLoopAsync ();
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
        }

        // don't use the passed in consensus service
        consensusService = new vol.ConsensusService ();
        consensusService.load ( this.network );

        runInAction (() => {
            this.consensusService = consensusService;
        });

        for ( let accountIndex of this.accountIndices ) {
            const accountID = this.accountIDsByIndex [ accountIndex ];
            if ( accountID === undefined ) continue;
            debugLog ( 'loading account', accountID );
            const account = new AccountStateService ( this, accountIndex, accountID );
            this.accounts [ accountID ] = account;
        }

        ( async () => {

            debugLog ( 'DISCOVER MINERS' );
            await this.consensusService.discoverMinersSinglePassAsync ();

            debugLog ( 'START CONSENSUS SERVICE' );
            this.consensusService.startServiceLoopAsync (() => { this.saveConsensusState (); });

            debugLog ( 'START ACCOUNTS' );
            for ( let accountID in this.accounts ) {
                this.accounts [ accountID ].startServiceLoopAsync ();
            }
        })();
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
            AppDB.deleteNetworkAsync ( this.networkID );
            this.networkID = false;

            hooks.finalize ( this );
        }
    }

    //----------------------------------------------------------------//
    finalize () {

        for ( let accountID in this.accounts ) {
            hooks.finalize ( this.accounts [ accountID ]);
        }
        hooks.finalize ( this.consensusService );
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
    getAccount ( accountID ) {
        return _.has ( this.accounts, accountID ) ? this.accounts [ accountID ] : false;
    }

    //----------------------------------------------------------------//
    getPrimaryURL ( path, query, mostCurrent ) {
        return this.consensusService.formatServiceURL ( this.network.nodeURL, path, query, mostCurrent );
    }

    //----------------------------------------------------------------//
    getServiceURL ( path, query, mostCurrent ) {
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
    isFavoriteOffer ( offerID ) {

        return this.favoriteOffers.includes ( offerID );
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
    @action
    async resetConsensus () {

        debugLog ( 'RESET CONSENSUS' );

        this.revocable.revokeAll ();
        hooks.finalize ( this.consensusService );

        this.network.height = 0;
        this.network.digest = this.network.genesis;
        this.network.minerURLs = [];
        
        this.consensusService = new vol.ConsensusService ();
        this.consensusService.load ( this.network );
        this.startServiceLoopAsync (() => { this.saveConsensusState (); });
    }

    //----------------------------------------------------------------//
    @action
    saveConsensusState () {

        this.consensusService.save ( this.network );
    }

    //----------------------------------------------------------------//
    @action
    setAccountRequest ( password, phraseOrKey, keyID, privateKeyHex, publicKeyHex, signature ) {

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

        const encoded = vol.util.encodeAccountRequest ( this.genesis, publicKeyHex, signature );

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

    //----------------------------------------------------------------//
    @action
    setMarketplaceURL ( url ) {

        this.network.marketplaceURL = url || false;
    }

    //----------------------------------------------------------------//
    @action
    toggleFavoriteOffer ( offerID ) {

        const favorites = this.favoriteOffers ? this.favoriteOffers.slice () : [];
        const index = favorites.indexOf ( offerID );

        if ( index < 0 ) {
            favorites.push ( offerID );
        }
        else {
            favorites.splice ( index, 1 );
        }
        this.network.favoriteOffers = favorites;
    }
}
