// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AccountStateService }          from './AccountStateService';
import { AppStateService }              from './AppStateService';
import { InventoryController }          from 'cardmotron';
import { assert, crypto, excel, ProgressController, randomBytes, RevocableContext, SingleColumnContainerView, StorageContext, util } from 'fgc';
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
    @computed get genesis               () { return this.network.genesis || ''; }
    @computed get height                () { return this.consensus.height; }
    @computed get identity              () { return this.network.identity; }
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
    affirmMiner ( minerID, url ) {

        const miner = this.minersByID [ minerID ] || {};

        if ( miner.url ) {
            miner.url = url;
            return;
        }

        debugLog ( 'AFFIRMING MINER', minerID, url );

        miner.minerID   = minerID;
        miner.height    = -1;
        miner.prev      = false;
        miner.peek      = false;
        miner.url       = url;

        this.minersByID [ minerID ] = miner;
    }

    //----------------------------------------------------------------//
    @action
    assertAccountService ( accountID ) {

        if ( !this.hasAccount ( accountID )) throw new Error ( `Account not found: ${ accountID }` );
        return this.accounts [ accountID ];
    }

    //----------------------------------------------------------------//
    @action
    async confirmMinersAsync () {

        const consensus = this.consensus;

        const pendingURLs = {};

        // fetch all the chains
        pendingURLs [ this.nodeURL ] = true;
        for ( let nodeURL in consensus.urls ) {
            pendingURLs [ nodeURL ] = true;
        }

        const confirmMiner = async ( nodeURL, isPrimary ) => {

            debugLog ( 'CHECKING:', nodeURL );

            try {

                const confirmURL        = url.parse ( nodeURL );
                confirmURL.pathname     = `/`;

                let result = await this.revocable.fetchJSON ( url.format ( confirmURL ));

                if ( result.minerID && result.isMiner ) {
                    debugLog ( 'FOUND A MINER:', nodeURL );
                    if ( result.genesis === this.network.genesis ) {
                        this.affirmMiner ( result.minerID, nodeURL );
                    }
                }

                if ( isPrimary ) {
                    runInAction (() => {
                        this.network.genesisMismatch = ( result.genesis !== this.network.genesis );
                    })
                }

                confirmURL.pathname     = `/miners`;
                result = await this.revocable.fetchJSON ( url.format ( confirmURL ));

                if ( result.miners ) {
                    this.extendNetwork ( result.miners );
                }
            }
            catch ( error ) {
                debugLog ( error );
            }
        }

        const promises = [];
        for ( let nodeURL in pendingURLs ) {
            if ( this.ignoreURLs [ nodeURL ]) continue;
            this.ignoreURLs [ nodeURL ] = true;
            promises.push ( confirmMiner ( nodeURL, nodeURL = this.nodeURL ));
        }
        await this.revocable.all ( promises );
    }

    //----------------------------------------------------------------//
    constructor ( appState, networkID, nodeURL, identity ) {

        assert ( appState );

        this.appState       = appState;
        this.revocable      = new RevocableContext ();
        this.storage        = new StorageContext ();

        const network = {
            nodeURL:            nodeURL || '',
            identity:           identity,
            accountIndices:     [],
            accountIDsByIndex:  {},
            pendingAccounts:    {},
            genesis:            false,
            genesisMismatch:    false,
        };

        const consensus = {
            height:             0,
            digest:             false,
            step:               0,
            isCurrent:          false,
            urls:               {},
        };

        this.storage.persist ( this, 'network',     `.vol.NETWORK.${ networkID }`,              network );
        this.storage.persist ( this, 'consensus',   `.vol.NETWORK.${ networkID }.CONSENSUS`,    consensus );
        
        runInAction (() => {
            this.networkID = networkID;
        });

        for ( let accountIndex of this.accountIndices ) {

            const accountID = this.accountIDsByIndex [ accountIndex ];
            if ( accountID === undefined ) continue;

            debugLog ( 'loading account', accountID );
            const account = new AccountStateService ( this, accountIndex, accountID );
            this.accounts [ accountID ] = account;
        }

        this.networkInfoServiceLoop ();
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
            this.storage.remove ( this, 'consensus' );
            this.appState.appDB.deleteNetworkAsync ( this.networkID );
            this.networkID = false;

            this.finalize ();
        }
    }

    //----------------------------------------------------------------//
    @action
    extendNetwork ( minerURLs ) {

        for ( let url of minerURLs ) {
            this.consensus.urls [ url ] = true;
        }
    }

    //----------------------------------------------------------------//
    finalize () {

        for ( let accountID in this.accounts ) {
            this.accounts [ accountID ].finalize ();
        }

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

        const serviceURL        = url.parse ( base );
        serviceURL.pathname     = path;
        serviceURL.query        = _.cloneDeep ( query || {} );

        if ( mostCurrent !== true ) {
            serviceURL.query.at = this.consensus.height;
        }

        return url.format ( serviceURL );
    }

    //----------------------------------------------------------------//
    @action
    getAccount ( accountID ) {

        return _.has ( this.accounts, accountID ) ? this.accounts [ accountID ] : false;
    }

    //----------------------------------------------------------------//
    getServiceURL ( path, query, mostCurrent ) {

        return this.formatServiceURL ( this.nodeURL, path, query, mostCurrent );
    }

    //----------------------------------------------------------------//
    getServiceURLs ( path, query, mostCurrent ) {

        const urls = [];

        for ( let minerID in this.minersByID ) {
            const miner = this.minersByID [ minerID ];
            if ( miner.online ) {
                urls.push ( this.formatServiceURL ( miner.url, path, query, mostCurrent ));
            }
        }
        return urls;
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
    async networkInfoServiceLoop () {

        let count = this.serviceLoopCount || 0;
        debugLog ( 'SERVICE LOOP RUN:', count );
        this.serviceLoopCount = count + 1;

        let timeout = await this.scanNetworkAsync ();
        debugLog ( 'Next update in...', timeout );
        this.revocable.timeout (() => { this.networkInfoServiceLoop ()}, timeout );
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
    async scanNetworkAsync () {

        debugLog ( 'SCAN NETWORK' );
        debugLog ( 'SCANNED', JSON.stringify ( this.ignoreURLs ));

        const consensus = this.consensus;
        const nextHeight = consensus.height + consensus.step;

        await this.confirmMinersAsync ();

        if ( _.size ( this.minersByID ) === 0 ) {
            debugLog ( 'No miners found.' );
            return 5000;
        }

        const peek = async ( miner ) => {

            debugLog ( 'PEEK:', miner.url, consensus.height, nextHeight );

            runInAction (() => {
                miner.isBusy = true;
            })

            try {

                // "peek" at the headers of the current and next block; also get a random sample of up to 16 miners.
                const peekURL       = url.parse ( miner.url );
                peekURL.pathname    = `/consensus/peek`;
                peekURL.query       = { peek: nextHeight, prev: consensus.height, sampleMiners : 16 };

                const height        = consensus.height;

                const result = await this.revocable.fetchJSON ( url.format ( peekURL ));
                
                debugLog ( 'PEEK RESULT:', miner.url, result );

                if ( result.genesis === this.network.genesis ) {
                    result.miners.push ( miner.url );
                    this.extendNetwork ( result.miners );
                    this.updateMinerStatus ( result.minerID, height, miner.url, result.prev, result.peek );
                }
                else {
                    this.updateMinerOffline ( miner.minerID );
                }
            }
            catch ( error ) {
                debugLog ( error );
                this.updateMinerOffline ( miner.minerID );
            }
        }

        const promises = [];
        for ( let minerID in this.minersByID ) {
            const miner = this.minersByID [ minerID ];
            if ( miner.isBusy ) continue;

            const promise = peek ( miner );

            if (( miner.height <= 0 ) || ( miner.prev )) {
                promises.push ( promise );
            }
        }

        await this.revocable.all ( promises );

        const onlineCount = this.updateConsensus ();
        if ( !onlineCount ) return 5000;

        const timeout = consensus.isCurrent ? 15000 : 1;
        return timeout;
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

    //----------------------------------------------------------------//
    @action
    updateConsensus () {

        debugLog ( 'UPDATE' );

        const consensus = this.consensus;
        const nextHeight = consensus.height + consensus.step;

        let minerCount      = 0;
        let onlineCount     = 0;
        let currentCount    = 0;
        let matchCount      = 0;
        let missingCount    = 0;

        let nextDigest      = false;

        for ( let minerID in this.minersByID ) {

            assert ( minerID );

            const miner = this.minersByID [ minerID ];
            debugLog ( 'MINER', miner.height, minerID, miner.prev, miner.peek );

            // completely ignore offline miners and miners not at current height
            if ( !miner.online ) continue;

            onlineCount++;

            if ( miner.height !== consensus.height ) continue;

            // running count of miners we care about
            minerCount++;

            // exclude nodes missing 'prev'
            if ( miner.prev === false ) {
                debugLog ( 'MISSING', minerID, miner.height );
                missingCount++;
                continue;
            }

            currentCount++;

            // 'header' may be missing if 'nextHeight' hasn't yet been mined.
            if ( miner.peek ) {

                nextDigest = nextDigest || miner.peek;

                if ( miner.peek === nextDigest ) {
                    matchCount++;
                }
            }
        }

        debugLog ( 'CURRENT COUNT:', currentCount, 'MATCH COUNT:', matchCount );

        // no miners for current step
        if ( minerCount === 0 ) return onlineCount;

        if ( currentCount > 0 ) {

            if ( matchCount === currentCount ) {

                debugLog ( 'SPEED UP' );

                if ( consensus.step > 2 ) {
                    consensus.isCurrent = false;
                }

                consensus.height        = nextHeight;
                consensus.digest        = nextDigest;

                consensus.step = consensus.step ? consensus.step * 2 : 1;
            }
            else {

                debugLog ( 'SLOW DOWN' );

                // the check failed and is only one step ahead, thus the current height must be current.
                if ( consensus.step === 1 ) {
                    consensus.isCurrent = true;
                }
                consensus.step = consensus.step > 1 ? consensus.step / 2 : 1;
            }
        }
        else if ( missingCount === minerCount ) {

            debugLog ( 'RESET', missingCount, minerCount, JSON.stringify ( this.minersByID, null, 4 ));

            // every single node has backslid; start over.
            consensus.height        = 0;
            consensus.digest        = this.network.genesis;
            consensus.step          = 0;
            consensus.isCurrent     = false;
        }

        debugLog ( 'STEP', {
            currentCount:   currentCount,
            matchCount:     matchCount,
            height:         consensus.height,
            step:           consensus.step,
            digest:         consensus.digest,
        });

        debugLog ( 'MINERS', JSON.stringify ( this.minersByID, null, 4 ));

        return onlineCount;
    }

    //----------------------------------------------------------------//
    @action
    updateMinerOffline ( minerID ) {

        const miner         = this.minersByID [ minerID ];

        debugLog ( 'UPDATE MINER OFFLINE', minerID, );

        miner.isBusy        = false;
        miner.online        = false;
    }

    //----------------------------------------------------------------//
    @action
    updateMinerStatus ( minerID, height, url, prev, peek ) {

        const consensus     = this.consensus;
        const miner         = this.minersByID [ minerID ];

        debugLog ( 'UPDATE MINER', minerID, height, consensus.height, url, prev, peek );

        miner.minerID       = minerID;
        miner.height        = height;
        miner.prev          = prev ? prev.digest : false;
        miner.peek          = peek ? peek.digest : false;
        miner.url           = url;
        miner.isBusy        = false;
        miner.online        = true;

        if ( consensus.height === 0 ) {
            consensus.digest = this.network.genesis;
        }
    }
}
