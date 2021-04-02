// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AppStateService }              from './AppStateService';
import { InventoryController }          from 'cardmotron';
import { assert, crypto, excel, ProgressController, randomBytes, RevocableContext, SingleColumnContainerView, StorageContext, util } from 'fgc';
import * as bcrypt                      from 'bcryptjs';
import _                                from 'lodash';
import { action, computed, extendObservable, observable, observe, reaction, runInAction } from 'mobx';
import React                            from 'react';
import url                              from 'url';

//const debugLog = function () {}
const debugLog = function ( ...args ) { console.log ( '@NETWORK SERVICE:', ...args ); }

//================================================================//
// NetworkStateService
//================================================================//
export class NetworkStateService {

    @observable networkID       = '';
    @observable minersByID      = {};
    @observable ignoreURLs      = {};

    @computed get accounts              () { return this.network.accounts; }
    @computed get controlKey            () { return this.network.controlKey; }
    @computed get height                () { return this.consensus.height; }
    @computed get identity              () { return this.network.identity; }
    @computed get nodeURL               () { return this.network.nodeURL; }
    @computed get pendingAccounts       () { return this.network.pendingAccounts; }    

    //----------------------------------------------------------------//
    @action
    affirmAccountAndKey ( password, accountID, keyName, phraseOrKey, privateKeyHex, publicKeyHex ) {

        if ( password ) {
            this.appState.assertPassword ( password );
        }

        const accounts = this.accounts;

        let account = accounts [ accountID ] || {
            keys: {},
            pendingTransactions: [],
            stagedTransactions: [],
            transactionError: false,
        };

        let key = account.keys [ keyName ] || {};

        key.phraseOrKeyAES      = password ? crypto.aesPlainToCipher ( phraseOrKey, password ) : phraseOrKey;
        key.privateKeyHexAES    = password ? crypto.aesPlainToCipher ( privateKeyHex, password ) : privateKeyHex;
        key.publicKeyHex        = publicKeyHex;

        account.keys [ keyName ] = key;

        accounts [ accountID ] = account;
    }

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

        this.network.controlKey = key;
    }

    //----------------------------------------------------------------//
    @action
    affirmNetwork ( networkID, identity, nodeURL ) {

        const network = {
            nodeURL:            nodeURL || '',
            identity:           identity,
            accounts:           {},
            pendingAccounts:    {},
        };

        this.loadNetwork ( networkID, network );
        this.network.nodeURL = nodeURL;
    }

    //----------------------------------------------------------------//
    @action
    confirmMiner ( minerID, url ) {

        const miner = this.minersByID [ minerID ] || {};

        if ( miner.url ) {
            miner.url = url;
            return;
        }

        console.log ( 'CONSENSUS: CONFIRM MINER', minerID, url );

        miner.minerID   = minerID;
        miner.height    = -1;
        miner.prev      = false;
        miner.peek      = false;
        miner.url       = url;

        this.minersByID [ minerID ] = miner;
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

        const confirmMiner = async ( nodeURL ) => {

            console.log ( 'CONSENSUS: CONFIRM:', nodeURL );

            try {
                // "peek" at the headers of the current and next block; also get a random sample of up to 16 miners.
                const confirmURL        = url.parse ( nodeURL );
                confirmURL.pathname     = `/`;

                const result = await this.revocable.fetchJSON ( url.format ( confirmURL ));

                if ( result.minerID ) {
                    this.confirmMiner ( result.minerID, nodeURL );
                }
            }
            catch ( error ) {
                console.log ( error );
            }
        }

        const promises = [];
        for ( let nodeURL in pendingURLs ) {
            if ( this.ignoreURLs [ nodeURL ]) continue;
            this.ignoreURLs [ nodeURL ] = true;
            promises.push ( confirmMiner ( nodeURL ));
        }
        await this.revocable.all ( promises );
    }

    //----------------------------------------------------------------//
    constructor ( appState, networkID, nodeURL, identity ) {

        assert ( appState );

        this.appState       = appState;
        this.revocable      = new RevocableContext ();
        this.storage        = new StorageContext ();

        if ( networkID ) {
            if ( nodeURL ) {
                this.affirmNetwork ( networkID, nodeURL, identity );
            }
            else {
                this.loadNetwork ( networkID );
            }
        }
        this.networkInfoServiceLoop ();
    }

    //----------------------------------------------------------------//
    @action
    deleteAccount ( accountID ) {

        debugLog ( 'DELETING ACCOUNT:', accountID );

        // const accounts = _.cloneDeep ( this.accounts );

        if ( _.has ( this.accounts, accountID )) {
            debugLog ( 'DELETING ACCOUNT FROM LOCAL STORAGE:', accountID );
            delete this.accounts [ accountID ];
            // this.network.accounts = accounts;
        }
        
        this.appState.appDB.deleteAccountAsync ( this.networkID, accountID );
    }

    //----------------------------------------------------------------//
    @action
    deleteAccountRequest ( requestID ) {

        delete this.pendingAccounts [ requestID ];
    }

    //----------------------------------------------------------------//
    @action
    deleteMinerControlKey () {

        delete this.controlKey;
    }

    //----------------------------------------------------------------//
    @action
    deleteNetwork () {

        if ( this.networkID ) {
            
            debugLog ( 'deleting network', this.networkID );
            
            this.revocable.revokeAll ();

            this.storage.remove ( this, 'network' );
            this.storage.remove ( this, 'consensus' );
            this.appState.appDB.deleteNetworkAsync ( this.networkID );
            this.networkID = false;
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

        this.revocable.finalize ();
        this.storage.finalize ();
        this.appState.finalize ();
    }

    //----------------------------------------------------------------//
    findAccountIdByPublicKey ( publicKey ) {

        if ( this.hasNetwork ) {
            const accounts = this.accounts;
            for ( let accountID in accounts ) {
                const account = accounts [ accountID ];
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
    getAccount ( accountID ) {

        if ( this.hasNetwork ) {
            accountID = accountID || this.accountID;
            const accounts = this.accounts;
            return _.has ( accounts, accountID ) ? accounts [ accountID ] : false;
        }
        return false;
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
            urls.push ( this.formatServiceURL ( miner.url, path, query, mostCurrent ));
        }
        return urls;
    }

    //----------------------------------------------------------------//
    @computed get
    hasNetwork () {

        return ( this.networkID && this.network );
    }

    //----------------------------------------------------------------//
    @action
    importAccountRequest ( requestID, accountID, keyName ) {

        if ( !_.has ( this.pendingAccounts, requestID )) return;

        let request = this.pendingAccounts [ requestID ];

        this.affirmAccountAndKey (
            false,
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
    loadNetwork ( networkID, networkInit ) {

        try {

            const consensus = {
                height:             0,
                digest:             false,
                genesis:            false,
                step:               0,
                isCurrent:          false,
                urls:               {},
            };

            this.storage.persist ( this, 'network',     `.vol_network_${ networkID }`,      networkInit );
            this.storage.persist ( this, 'consensus',   `.vol_consensus_${ networkID }`,    consensus );
        
            this.networkID = networkID;
        }
        catch ( error ) {
            throw new Error ( 'Network not found.' );
        }
    }

    //----------------------------------------------------------------//
    async networkInfoServiceLoop () {

        let timeout = await this.scanNetworkAsync ();
        this.revocable.timeout (() => { this.networkInfoServiceLoop ()}, timeout );
    }

    //----------------------------------------------------------------//
    @action
    renameAccount ( oldName, newName ) {

        if ( !_.has ( this.accounts, oldName )) return;        
        
        this.accounts [ newName ] = _.cloneDeep ( this.accounts [ oldName ]); // or mobx will bitch at us
        delete this.accounts [ oldName ];
    }

    //----------------------------------------------------------------//
    @action
    async scanNetworkAsync () {

        console.log ( 'CONSENSUS: SCAN NETWORK' );
        console.log ( 'CONSENSUS: IGNORE', JSON.stringify ( this.ignoreURLs ));

        const consensus = this.consensus;
        const nextHeight = consensus.height + consensus.step;

        await this.confirmMinersAsync ();

        const peek = async ( miner ) => {

            console.log ( 'CONSENSUS: PEEK:', miner.url, consensus.height, nextHeight );

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
                
                console.log ( 'CONSENSUS: PEEK RESULT:', miner.url, result );

                result.miners.push ( miner.url );
                this.extendNetwork ( result.miners );
                this.updateMinerStatus ( result.minerID, height, miner.url, result.prev, result.peek );       
            }
            catch ( error ) {
                console.log ( error );
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

        this.updateConsensus ();

        const timeout = consensus.isCurrent ? 15000 : 1;
        console.log ( 'CONSENSUS: Next update in...', timeout );
        return timeout;
    }

    //----------------------------------------------------------------//
    @action
    setAccountRequest ( password, phraseOrKey, keyID, privateKeyHex, publicKeyHex ) {

        this.appState.assertPassword ( password );

        this.flags.promptFirstAccount = false;

        const phraseOrKeyAES = crypto.aesPlainToCipher ( phraseOrKey, password );
        if ( phraseOrKey !== crypto.aesCipherToPlain ( phraseOrKeyAES, password )) throw new Error ( 'AES error' );

        const privateKeyHexAES = crypto.aesPlainToCipher ( privateKeyHex, password );
        if ( privateKeyHex !== crypto.aesCipherToPlain ( privateKeyHexAES, password )) throw new Error ( 'AES error' );

        let requestID;
        do {
            requestID = `vol_${ randomBytes ( 6 ).toString ( 'hex' )}`;
        } while ( _.has ( this.pendingAccounts, requestID ));

        const request = {
            networkID:              this.identity,
            key: {
                type:               'EC_HEX',
                groupName:          'secp256k1',
                publicKey:          publicKeyHex,
            },
        }

        const requestJSON   = JSON.stringify ( request );
        const encoded       = Buffer.from ( requestJSON, 'utf8' ).toString ( 'base64' );

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

        console.log ( 'CONSENSUS: UPDATE' );

        const consensus = this.consensus;
        const nextHeight = consensus.height + consensus.step;

        let minerCount      = 0;
        let currentCount    = 0;
        let matchCount      = 0;
        let missingCount    = 0;

        let nextDigest      = false;

        for ( let minerID in this.minersByID ) {

            const miner = this.minersByID [ minerID ];
            console.log ( 'CONSENSUS: MINER', miner.height, minerID, miner.prev, miner.peek );

            // completely ignore mines not at current height
            if ( miner.height !== consensus.height ) continue;

            // running count of miners we care about
            minerCount++;

            // exclude nodes missing 'prev'
            if ( miner.prev === false ) {
                console.log ( 'CONSENSUS: MISSING', minerID, miner.height );
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

        // no miners for current step
        if ( minerCount === 0 ) return;

        if ( currentCount > 0 ) {

            if ( matchCount === currentCount ) {

                console.log ( 'CONSENSUS: SPEED UP' );

                if ( consensus.step > 2 ) {
                    consensus.isCurrent = false;
                }

                consensus.height        = nextHeight;
                consensus.digest        = nextDigest;

                consensus.step = consensus.step ? consensus.step * 2 : 1;
            }
            else {

                console.log ( 'CONSENSUS: SLOW DOWN' );

                // the check failed and is only one step ahead, thus the current height must be current.
                if ( consensus.step === 1 ) {
                    consensus.isCurrent = true;
                }
                consensus.step = consensus.step > 1 ? consensus.step / 2 : 1;
            }
        }
        else if ( missingCount === minerCount ) {

            console.log ( 'CONSENSUS: RESET', missingCount, minerCount, JSON.strongify ( this.minersByID, null, 4 ));

            // every single node has backslid; start over.
            consensus.height        = 0;
            consensus.digest        = consensus.genesis;
            consensus.step          = 0;
            consensus.isCurrent     = false;
        }

        console.log ( 'CONSENSUS: STEP', {
            currentCount:   currentCount,
            matchCount:     matchCount,
            height:         consensus.height,
            step:           consensus.step,
            digest:         consensus.digest,
        });

        console.log ( 'CONSENSUS: MINERS', JSON.stringify ( this.minersByID, null, 4 ));
    }

    //----------------------------------------------------------------//
    @action
    updateMinerStatus ( minerID, height, url, prev, peek ) {

        const consensus     = this.consensus;
        const miner         = this.minersByID [ minerID ];

        console.log ( 'CONSENSUS: UPDATE MINER', minerID, height, consensus.height, url, prev, peek );

        miner.minerID       = minerID;
        miner.height        = height;
        miner.prev          = prev ? prev.digest : false;
        miner.peek          = peek ? peek.digest : false;
        miner.url           = url;
        miner.isBusy        = false;

        if (( consensus.height === 0 ) && !consensus.genesis ) {
            consensus.genesis = prev.digest;
            consensus.digest = prev.digest;
        }
    }
}
