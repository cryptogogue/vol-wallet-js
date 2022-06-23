// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AccountStateService }          from './AccountStateService';
import * as AppDB                       from './AppDB';
import { assert, crypto, hooks, randomBytes, RevocableContext, storage, StorageContext, util } from 'fgc';
import _                                from 'lodash';
import { action, computed, observable, runInAction, toJS } from 'mobx';
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
    @observable pendingAccountTXs       = {};
    @observable networkID               = '';

    @computed get accountIndices        () { return this.network.accountIndices; }
    @computed get accountIDsByIndex     () { return this.network.accountIDsByIndex; }
    @computed get digest                () { return this.consensusService.digest || ''; }
    @computed get favoriteOffers        () { return this.network.favoriteOffers || []; }
    @computed get favoriteStamps        () { return this.network.favoriteStamps || []; }
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

            this.serviceLoopAsync ();
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
        delete this.pendingAccountTXs [ requestID ];
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
    isFavoriteOffer ( offerID ) {

        return this.favoriteOffers.includes ( offerID );
    }

    //----------------------------------------------------------------//
    isFavoriteStamp ( stampID ) {

        return this.favoriteStamps.includes ( stampID );
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

        this.network.height         = 0;
        this.network.nextHeight     = 0;
        this.network.digest         = this.network.genesis;
        this.network.minerURLs      = [];
        
        this.consensusService = new vol.ConsensusService ();
        this.consensusService.load ( this.network );
        this.consensusService.startServiceLoopAsync (() => { this.saveConsensusState (); });
    }

    //----------------------------------------------------------------//
    @action
    saveConsensusState () {

        this.consensusService.save ( this.network );
    }

    //----------------------------------------------------------------//
    async serviceLoopAsync () {

        debugLog ( 'SERVICE LOOP' );

        try {

            for ( let requestID in this.pendingAccounts ) {

                const pendingAccount = this.pendingAccounts [ requestID ];
                if ( pendingAccount.readyToImport ) continue;

                try {

                    debugLog ( 'pending account:', toJS ( pendingAccount ));

                    const keyID = pendingAccount.keyID;
                    const data = await this.revocable.fetchJSON ( this.getServiceURL ( `/keys/${ keyID }` ));
                    const keyInfo = data && data.keyInfo;

                    debugLog ( 'key info:', data );

                    if ( keyInfo ) {
                        this.importAccountRequest (
                            requestID,
                            keyInfo.accountIndex,
                            keyInfo.accountName,
                            keyInfo.keyName
                        );
                    }
                    else if ( pendingAccount.txQueueEntry ) {

                        debugLog ( 'SENDING NEW ACCOUNT TX', toJS ( pendingAccount.txQueueEntry ));

                        const entry = this.pendingAccountTXs [ requestID ] || vol.TransactionQueueEntry.load ( pendingAccount.txQueueEntry );
                        await entry.processAsync ( this.consensusService, false, ( uuid, message ) => { pendingAccount.error = message; });

                        runInAction (() => {
                            this.pendingAccountTXs [ requestID ] = entry;
                            pendingAccount.txQueueEntry = toJS ( entry );
                        });
                    }
                }
                catch ( error ) {
                    console.log ( error );
                }
            }

            this.revocable.timeout (() => { this.serviceLoopAsync ()}, 5000 );
        }
        catch ( error ) {
            debugLog ( error );
        }
    }

    //----------------------------------------------------------------//
    @action
    setAccountRequest ( password, phraseOrKey, key, signature, txBody ) {

        this.appState.assertPassword ( password );
        this.appState.flags.promptFirstAccount = false;

        const privateKeyHex     = key.getPrivateHex ();
        const publicKeyHex      = key.getPublicHex ();

        const pendingAccount = {
            requestID:              util.generateUUIDV4 (),
            keyID:                  key.getKeyID (), // needed to recover account later
            publicKeyHex:           publicKeyHex,
            privateKeyHexAES:       crypto.aesPlainToCipher ( privateKeyHex, password ),
            phraseOrKeyAES:         crypto.aesPlainToCipher ( phraseOrKey, password ),
        };

        if ( txBody ) {

            txBody          = _.cloneDeep ( txBody );
            txBody.uuid     = pendingAccount.requestID;

            const txQueueEntry = new vol.TransactionQueueEntry ( txBody.uuid, txBody.type, vol.util.signTransaction ( key, txBody ));
            txQueueEntry.submitWithNonce ( txBody.maker.nonce );

            pendingAccount.txQueueEntry = toJS ( txQueueEntry );
        }
        else {

            pendingAccount.encoded = vol.util.encodeAccountRequest ( this.genesis, publicKeyHex, signature );
        }

        this.pendingAccounts [ pendingAccount.requestID ] = pendingAccount;
    }

    //----------------------------------------------------------------//
    @action
    setMarketplaceURL ( url ) {

        this.network.marketplaceURL = url || false;
    }

    //----------------------------------------------------------------//
    @action
    toggleFavoriteOffer ( offerID ) {

        this.network.favoriteOffers = util.toggleArrayMember ( this.favoriteOffers, offerID );
    }

    //----------------------------------------------------------------//
    @action
    toggleFavoriteStamp ( stampID ) {

        this.network.favoriteStamps = util.toggleArrayMember ( this.favoriteStamps, stampID );
    }
}
