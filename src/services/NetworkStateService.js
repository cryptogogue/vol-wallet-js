// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AppStateService }              from './AppStateService';
import { InventoryController }          from 'cardmotron';
import { assert, crypto, excel, ProgressController, randomBytes, RevocableContext, SingleColumnContainerView, StorageContext, util } from 'fgc';
import * as bcrypt                      from 'bcryptjs';
import _                                from 'lodash';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import React                            from 'react';
import url                              from 'url';

//================================================================//
// NetworkStateService
//================================================================//
export class NetworkStateService extends AppStateService {

    //----------------------------------------------------------------//
    @computed get
    accounts () {
        return this.network.accounts;
    }

    //----------------------------------------------------------------//
    @action
    affirmAccountAndKey ( password, accountID, keyName, phraseOrKey, privateKeyHex, publicKeyHex ) {

        this.flags.promptFirstAccount = false;

        this.assertHasNetwork ();

        if ( password ) {
            this.assertPassword ( password );
        }

        const accounts = this.network.accounts;

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

        this.assertHasNetwork ();

        if ( password ) {
            this.assertPassword ( password );
        }

        let key = {};

        key.phraseOrKeyAES      = password ? crypto.aesPlainToCipher ( phraseOrKey, password ) : phraseOrKey;
        key.privateKeyHexAES    = password ? crypto.aesPlainToCipher ( privateKeyHex, password ) : privateKeyHex;
        key.publicKeyHex        = publicKeyHex;

        this.network.controlKey = key;
    }

    //----------------------------------------------------------------//
    assertHasNetwork () {
        if ( !this.hasNetwork ) throw new Error ( 'No network selected.' );
    }

    //----------------------------------------------------------------//
    constructor ( networkID ) {
        super ();

        if ( !_.has ( this.networks, networkID )) throw new Error ( 'Network not found.' );

        const consensus = {
            height:             0,
            digest:             false,
            step:               0,
            isCurrent:          false,
            isConflicted:       false,
            urls:               [],
        };

        this.storage.persist ( this, 'consensus',       `.vol_consensus_${ networkID }`,        consensus );

        runInAction (() => {
            this.networkID = networkID;
        });

        this.networkInfoServiceLoop ();
    }

    //----------------------------------------------------------------//
    @action
    deleteAccount ( accountID ) {

        this.assertHasNetwork ();

        accountID = accountID || this.accountID;

        if ( accountID in this.network.accounts ) {
            delete this.network.accounts [ accountID ];
        }
        
        if ( accountID === this.accountID ) {
            this.accountID = '';
            this.setAccountInfo ();
        }
    }

    //----------------------------------------------------------------//
    @action
    deleteAccountRequest ( requestID ) {

        delete this.pendingAccounts [ requestID ];
    }

    //----------------------------------------------------------------//
    @action
    deleteMinerControlKey () {

        delete this.network.controlKey;
    }

    //----------------------------------------------------------------//
    finalize () {

        super.finalize ();
    }

    //----------------------------------------------------------------//
    findAccountIdByPublicKey ( publicKey ) {

        if ( this.hasNetwork ) {
            const accounts = this.network.accounts;
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
    formatServiceURL ( base, path, query ) {

        const serviceURL        = url.parse ( base );
        serviceURL.pathname     = path;
        serviceURL.query        = _.cloneDeep ( query || {} );
        serviceURL.query.at     = this.consensus.height;

        return url.format ( serviceURL );
    }

    //----------------------------------------------------------------//
    getAccount ( accountID ) {

        if ( this.hasNetwork ) {
            accountID = accountID || this.accountID;
            const accounts = this.network.accounts;
            return _.has ( accounts, accountID ) ? accounts [ accountID ] : false;
        }
        return false;
    }

    //----------------------------------------------------------------//
    getNetwork ( networkID ) {
        return super.getNetwork ( networkID || this.networkID );
    }

    //----------------------------------------------------------------//
    getServiceURL ( path, query ) {

        return this.formatServiceURL ( this.network.nodeURL, path, query );
    }

    //----------------------------------------------------------------//
    getServiceURLs ( path, query ) {

        const urls = [];

        for ( let nodeURL of this.consensus.urls ) {
            if ( nodeURL !== undefined ) {
                urls.push ( nodeURL );
            }
        }

        if ( urls.length === 0 ) {
            urls.push ( this.network.nodeURL ); 
        }

        const serviceURLs = [];

        for ( let nodeURL of urls ) {
            serviceURLs.push ( this.formatServiceURL ( nodeURL, path, query ));
        }

        return serviceURLs;
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
    @computed get
    network () {
        return this.getNetwork ();
    }

    //----------------------------------------------------------------//
    async networkInfoServiceLoop () {

        let timeout = await this.scanNetwork ();
        this.revocable.timeout (() => { this.networkInfoServiceLoop ()}, timeout );
    }

    //----------------------------------------------------------------//
    @computed get
    pendingAccounts () {
        return this.network.pendingAccounts;
    }

    //----------------------------------------------------------------//
    @action
    renameAccount ( oldName, newName ) {

        if ( !_.has ( this.accounts, oldName )) return;        
        
        this.accounts [ newName ] = _.cloneDeep ( this.accounts [ oldName ]); // or mobx will bitch at us
        delete this.accounts [ oldName ];
    }

    //----------------------------------------------------------------//
    async scanNetwork () {

        const consensus = this.consensus;

        const promises = [];
        const nextHeight = consensus.height + consensus.step;

        const fetchChain = async ( nodeURL ) => {

            try {

                const peekURL = url.parse ( nodeURL );
                peekURL.pathname = `/consensus/peek`;
                peekURL.query = { peek: nextHeight, prev: consensus.height, sampleMiners : 16 };

                const result = await this.revocable.fetchJSON ( url.format ( peekURL ));
                result.url = nodeURL;
                return result;
            }
            catch ( error ) {
            }
            return false;
        }

        // fetch all the chains
        for ( let nodeURL of consensus.urls ) {
            if ( nodeURL !== undefined ) {
                promises.push ( fetchChain ( nodeURL ));
            }
        }

        if ( promises.length === 0 ) {
            promises.push ( fetchChain ( this.network.nodeURL )); 
        }

        const results = await this.revocable.all ( promises );

        let maxCount        = 0;
        let frontRunner     = '';
        let prevDigest      = '';
        const histogram     = {};
        const resultURLs    = {};

        runInAction (() => {

            for ( let result of results ) {

                if ( typeof ( result.url ) !== 'string' ) continue;

                const header = result && result.peek;

                if ( header && ( header.height === nextHeight )) {

                    const digest = header.digest;
                    const count = ( histogram [ digest ] || 0 ) + 1;
                    histogram [ digest ] = count;

                    if ( maxCount < count ) {
                        maxCount        = count;
                        frontRunner     = digest;
                        prevDigest      = result.prev.digest;
                    }
                }

                if ( result.miners ) {
                    for ( let minerURL of result.miners ) {
                        resultURLs [ minerURL ] = true;
                    }
                }
                resultURLs [ result.url ] = true;
            }
            
            consensus.urls = _.cloneDeep ( _.keys ( resultURLs ));

            if ( maxCount && ( maxCount === consensus.urls.length )) {

                // we skipped multiple steps ahead and still found consensus, so we may not be "current."
                if ( consensus.step > 1 ) {
                    consensus.isCurrent = false;
                }

                if ( consensus.digest && ( consensus.digest !== prevDigest )) {
                    consensus.isConflicted = true;
                }

                consensus.height = nextHeight;
                consensus.digest = frontRunner;

                consensus.step = consensus.step ? consensus.step * 2 : 1;
            }
            else {

                // the check failed and is only one step ahead, thus the current height must be "current."
                if ( consensus.step === 1 ) {
                    consensus.isCurrent = true;
                }
                consensus.step = consensus.step > 1 ? consensus.step / 2 : 1;
            }
        });

        // console.log ( consensus.urls.length, maxCount, consensus.height, consensus.step, consensus.digest );

        return consensus.isCurrent ? 15000 : 1;
    }

    //----------------------------------------------------------------//
    @action
    setAccountRequest ( password, phraseOrKey, keyID, privateKeyHex, publicKeyHex ) {

        this.assertPassword ( password );

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
            networkID:          this.network.identity,
            key: {
                type:           'EC_HEX',
                groupName:      'secp256k1',
                publicKey:      publicKeyHex,
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
}
