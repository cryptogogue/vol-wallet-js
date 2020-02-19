// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as entitlements        from './util/entitlements';
import { assert, crypto, excel, hooks, randomBytes, RevocableContext, SingleColumnContainerView, StorageContext, util } from 'fgc';
import * as bcrypt              from 'bcryptjs';
import _                        from 'lodash';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import React                    from 'react';

const STORE_FLAGS               = '.vol_flags';
const STORE_NETWORKS            = '.vol_networks';
const STORE_PASSWORD_HASH       = '.vol_password_hash';
const STORE_SESSION             = '.vol_session';

export const NODE_TYPE = {
    UNKNOWN:    'UNKNOWN',
    MINING:     'MINING',
    MARKET:     'MARKET',
};

export const NODE_STATUS = {
    UNKNOWN:    'UNKNOWN',
    ONLINE:     'ONLINE',
    OFFLINE:    'OFFLINE',
};

//================================================================//
// AppStateService
//================================================================//
export class AppStateService {

    //----------------------------------------------------------------//
    @computed get
    account () {
        return this.getAccount ();
    }

    //----------------------------------------------------------------//
    @computed get
    accounts () {
        return this.network.accounts;
    }

    //----------------------------------------------------------------//
    @computed get
    accountKeyNames () {
        const account = this.account;
        return ( account && Object.keys ( account.keys )) || [];
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
    affirmNetwork ( name, identity, nodeURL ) {

        this.flags.promptFirstNetwork = false;

        if ( !_.has ( this.networks, name )) {
            this.networks [ name ] = {
                nodeURL:            nodeURL,
                identity:           identity,
                accounts:           {},
                pendingAccounts:    {},
            };
        }
        else {
            this.networks [ name ].nodeUTL = nodeURL;
        }
    }

    //----------------------------------------------------------------//
    assertHasAccount () {
        this.assertHasNetwork ();
        if ( !this.hasAccount ) throw new Error ( 'No account selected.' );
    }

    //----------------------------------------------------------------//
    assertHasNetwork () {
        if ( !this.hasNetwork ) throw new Error ( 'No network selected.' );
    }

    //----------------------------------------------------------------//
    assertPassword ( password ) {
        if ( !this.checkPassword ( password )) throw new Error ( 'Invalid wallet password.' );
    }

    //----------------------------------------------------------------//
    @computed get
    assetsUtilized () {

        let assetsUtilized = [];

        // touch .length to force update if change (mobx)
        const pendingTransactions = this.pendingTransactions;
        if ( pendingTransactions.length ) {
            for ( let i in pendingTransactions ) {
                assetsUtilized = assetsUtilized.concat ( pendingTransactions [ i ].assets );
            }
        }

        // touch .length to force update if change (mobx)
        const stagedTransactions = this.stagedTransactions;
        if ( stagedTransactions.length ) {
            for ( let i in stagedTransactions ) {
                assetsUtilized = assetsUtilized.concat ( stagedTransactions [ i ].assets );
            }
        }
        return assetsUtilized;
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
    @computed get
    canClearTransactions () {

        if ( !this.hasAccount ) return false;
        return (( this.account.stagedTransactions.length > 0 ) || ( this.account.pendingTransactions.length > 0 ));
    }

    //----------------------------------------------------------------//
    @computed get
    canSubmitTransactions () {

        if ( !this.hasAccount ) return false;
        if ( this.nextNonce < 0 ) return false;

        if ( this.stagedTransactions.length > 0 ) return true;
        if (( this.pendingTransactions.length > 0 ) && ( this.hasTransactionError )) return true;

        return false;
    }

    //----------------------------------------------------------------//
    @action
    changePassword ( password, newPassword ) {

        this.assertPassword ( password );

        for ( let networkName in this.networks ) {
            const network = this.networks [ networkName ];

            for ( let accountName in network.accounts ) {
                const account = network.accounts [ accountName ];
                
                for ( let keyName in account.keys ) {
                    const key = account.keys [ keyName ];

                    key.phraseOrKeyAES = crypto.aesPlainToCipher ( crypto.aesCipherToPlain ( key.phraseOrKeyAES, password ), newPassword );
                    key.privateKeyHexAES = crypto.aesPlainToCipher ( crypto.aesCipherToPlain ( key.privateKeyHexAES, password ), newPassword );
                }
            }

            for ( let requestID in network.pendingAccounts ) {
                const request = network.pendingAccounts [ requestID ];
                
                request.phraseOrKeyAES = crypto.aesPlainToCipher ( crypto.aesCipherToPlain ( request.phraseOrKeyAES, password ), newPassword );
                request.privateKeyHexAES = crypto.aesPlainToCipher ( crypto.aesCipherToPlain ( request.privateKeyHexAES, password ), newPassword );
            }
        }
        this.setPassword ( newPassword, false );
    }

    //----------------------------------------------------------------//
    checkPassword ( password ) {
        if ( password ) {
            const passwordHash = ( this.passwordHash ) || '';
            return (( passwordHash.length > 0 ) && bcrypt.compareSync ( password, passwordHash ));
        }
        return false;
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
    @action
    clearPendingTransactions () {

        if ( this.hasAccount ) {
            this.account.pendingTransactions = [];
            this.account.transactionError = false;
        }
    }

    //----------------------------------------------------------------//
    @action
    clearStagedTransactions () {

        if ( this.hasAccount ) {
            this.account.stagedTransactions = [];
        }
    }

    //----------------------------------------------------------------//
    @action
    confirmTransactions ( nonce ) {

        if ( this.hasAccount ) {
            let pendingTransactions = this.account.pendingTransactions;
            while (( pendingTransactions.length > 0 ) && ( pendingTransactions [ 0 ].nonce < nonce )) {
                pendingTransactions.shift ();
                this.account.transactionError = false;
            }
        }
    }

    //----------------------------------------------------------------//
    constructor ( networkID, accountID ) {

        this.revocable      = new RevocableContext ();

        networkID = networkID || '';
        accountID = accountID || '';

        extendObservable ( this, {
            networkID:              '',
            accountID:              '',
            accountInfo:            null,
            nextTransactionCost:    0,
        });

        const storageContext = new StorageContext ();

        const flags = {
            promptFirstNetwork:         true,
            promptFirstAccount:         true,
            promptFirstTransaction:     true,
        };

        storageContext.persist ( this, 'flags',             STORE_FLAGS,                flags );
        storageContext.persist ( this, 'networks',          STORE_NETWORKS,             {}); // account names index by network name
        storageContext.persist ( this, 'passwordHash',      STORE_PASSWORD_HASH,        '' );
        storageContext.persist ( this, 'session',           STORE_SESSION,              this.makeSession ( false ));

        this.storage = storageContext;

        runInAction (() => {

            if ( _.has ( this.networks, networkID )) {

                this.networkID = networkID;
                const network = this.network;

                if ( _.has ( network.accounts, accountID )) {
                    this.accountID = accountID;
                }
            }
        });

        this.setAccountInfo ();
        this.processTransactionsAsync ();
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
    deleteNetwork ( networkName ) {

        delete this.networks [ networkName ];
    }

    //----------------------------------------------------------------//
    @action
    deleteStorage () {

        this.storage.clear ();
        this.networkID = '';
        this.accountID = '';
        this.nextTransactionCost = 0;
        this.setAccountInfo ();
    }

    //----------------------------------------------------------------//
    @action
    deleteTransactions () {

        if ( this.hasAccount ) {
            this.account.pendingTransactions = [];
            this.account.stagedTransactions = [];
        }
    }

    //----------------------------------------------------------------//
    finalize () {

        this.revocable.finalize ();
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
    getAccount ( accountID ) {

        if ( this.hasNetwork ) {
            accountID = accountID || this.accountID;
            const accounts = this.network.accounts;
            return _.has ( accounts, accountID ) ? accounts [ accountID ] : false;
        }
        return false;
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
    getNetwork ( networkID ) {
        networkID = networkID || this.networkID;
        const networks = this.networks;
        return _.has ( networks, networkID ) ? networks [ networkID ] : null;
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
        return ( this.accountInfo.nonce >= 0 );
    }

    //----------------------------------------------------------------//
    @computed get
    hasNetwork () {
        return ( this.networkID && this.network );
    }

    //----------------------------------------------------------------//
    @computed get
    hasTransactionError () {
        return this.transactionError !== false;
    }

    //----------------------------------------------------------------//
    @computed get
    hasUser () {
        return ( this.passwordHash.length > 0 );
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
    isLoggedIn () {
        return ( this.session.isLoggedIn === true );
    }

    //----------------------------------------------------------------//
    @action
    login ( password ) {

        this.session = this.makeSession ( this.checkPassword ( password ));
    }

    //----------------------------------------------------------------//
    makeSession ( isLoggedIn ) {
        return { isLoggedIn: isLoggedIn };
    }

    //----------------------------------------------------------------//
    @computed get
    nextNonce () {

        if ( this.nonce < 0 ) return -1;

        const pendingTransactions = this.pendingTransactions;
        const pendingTop = pendingTransactions.length;

        return pendingTop > 0 ? pendingTransactions [ pendingTop - 1 ].nonce + 1 : this.nonce;
    }

    //----------------------------------------------------------------//
    @computed get
    network () {
        return this.getNetwork ();
    }

    //----------------------------------------------------------------//
    @computed get
    nonce () {
        return this.accountInfo.nonce;
    }

    //----------------------------------------------------------------//
    @computed get
    pendingAccounts () {
        return this.network.pendingAccounts;
    }

    //----------------------------------------------------------------//
    @computed get
    pendingTransactions () {
        return this.account.pendingTransactions;
    }

    //----------------------------------------------------------------//
    @action
    async processTransactionsAsync () {

        if ( !this.hasAccount ) return;

        if ( !this.hasTransactionError ) {

            let pendingTransactions = this.account.pendingTransactions;
            for ( let memo of this.pendingTransactions ) {

                const accountName   = memo.body.maker.accountName;
                const nonce         = memo.nonce; 
                
                try {

                    const url = `${ this.network.nodeURL }/accounts/${ accountName }/transactions/${ nonce }`;
                    const checkResult = await this.revocable.fetchJSON ( url );

                    switch ( checkResult.status ) {

                        case 'REJECTED':
                            runInAction (() => {
                                this.account.transactionError = {
                                    message:    checkResult.message,
                                    note:       checkResult.note,
                                }
                            });
                        break;

                        case 'UNKNOWN':
                            await this.putTransactionAsync ( memo );
                            break;

                        default:
                            break;
                    }
                }
                catch ( error ) {
                    console.log ( 'AN ERROR!', error );
                }
            }
        }
        
        this.revocable.timeout (() => { this.processTransactionsAsync ()}, 5000 );
    }

    //----------------------------------------------------------------//
    @action
    pushTransaction ( transaction ) {

        this.assertHasAccount ();

        let memo = {
            type:               transaction.type,
            note:               transaction.note,
            cost:               transaction.getCost (),
            body:               transaction.body,
            assets:             transaction.assetsUtilized,
        }

        this.account.stagedTransactions.push ( memo );
        this.setNextTransactionCost ( 0 );
        this.flags.promptFirstTransaction = false;
    }

    //----------------------------------------------------------------//
    async putTransactionAsync ( memo ) {

        const accountName   = memo.body.maker.accountName;
        const nonce         = memo.nonce; 
        const url           = `${ this.network.nodeURL }/accounts/${ accountName }/transactions/${ nonce }`;

        await this.revocable.fetchJSON ( url, {
            method :    'PUT',
            headers :   { 'content-type': 'application/json' },
            body :      JSON.stringify ( memo.envelope, null, 4 ),
        });
    }

    //----------------------------------------------------------------//
    @action
    renameAccount ( oldName, newName ) {

        console.log ( 'RENAME ACCOUNT', oldName, newName );

        if ( !_.has ( this.accounts, oldName )) return;        
        
        this.accounts [ newName ] = _.cloneDeep ( this.accounts [ oldName ]); // or mobx will bitch at us
        delete this.accounts [ oldName ];

        if ( this.accountID === oldName ) {
            this.accountID = newName;
        }
    }

    //----------------------------------------------------------------//
    @action
    setAccountInfo ( balance, nonce ) {

        this.accountInfo = {
            balance:    typeof ( balance ) === 'number' ? balance : -1,
            nonce:      typeof ( nonce ) === 'number' ? nonce : -1,
        };
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

    //----------------------------------------------------------------//
    @action
    setNextTransactionCost ( cost ) {

        this.nextTransactionCost = cost || 0;
    }

    //----------------------------------------------------------------//
    @action
    setFlag ( name, value ) {

        this.flags [ name ] = value;
    }

    //----------------------------------------------------------------//
    @action
    setPassword ( password, login ) {

        // Hash password with salt
        let passwordHash = bcrypt.hashSync ( password, 10 );
        assert ( passwordHash.length > 0 );

        this.passwordHash = passwordHash;

        if ( login ) {
            this.login ( password );
        }
    }

    //----------------------------------------------------------------//
    @computed get
    transactionError () {
        return this.account.transactionError || false;
    }

    //----------------------------------------------------------------//
    @computed get
    stagedTransactions () {
        return this.account.stagedTransactions;
    }

    //----------------------------------------------------------------//
    @action
    async submitTransactions ( password ) {

        this.assertHasAccount ();
        this.assertPassword ( password );

        let stagedTransactions      = this.account.stagedTransactions;
        let pendingTransactions     = this.account.pendingTransactions;

        this.account.transactionError = false;

        try {

            while ( this.canSubmitTransactions ) {

                let memo = _.cloneDeep ( stagedTransactions [ 0 ]);
                let nonce = this.nextNonce;

                let body = memo.body;
                body.note = randomBytes ( 12 ).toString ( 'hex' );
                body.maker.nonce = nonce;

                let envelope = {
                    body: JSON.stringify ( body ),
                };

                const hexKey            = this.account.keys [ body.maker.keyName ];
                const privateKeyHex     = crypto.aesCipherToPlain ( hexKey.privateKeyHexAES, password );
                const key               = await crypto.keyFromPrivateHex ( privateKeyHex );

                envelope.signature = {
                    hashAlgorithm:  'SHA256',
                    digest:         key.hash ( envelope.body ),
                    signature:      key.sign ( envelope.body ),
                };

                memo.envelope   = envelope;
                memo.nonce      = nonce;

                runInAction (() => {
                    stagedTransactions.shift ();
                    pendingTransactions.push ( memo );
                });
            }
        }
        catch ( error ) {
             console.log ( 'AN ERROR!', error );
        }

        try {
            for ( let memo of pendingTransactions ) {
                await this.putTransactionAsync ( memo );
            }
        }
        catch ( error ) {
            console.log ( 'AN ERROR!', error );
        }
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
