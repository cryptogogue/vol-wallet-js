// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AppStateService }              from './AppStateService';
import { InventoryController }          from 'cardmotron';
import { assert, crypto, excel, ProgressController, randomBytes, RevocableContext, SingleColumnContainerView, StorageContext, util } from 'fgc';
import * as bcrypt                      from 'bcryptjs';
import _                                from 'lodash';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import React                            from 'react';

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

        runInAction (() => {
            if ( _.has ( this.networks, networkID )) {

                this.networkID = networkID;
                const network = this.network;
            }
            else {
                throw new Error ( 'Network not found.' );
            }
        });
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
