// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AppDB }                        from './AppDB';
import { NetworkListService }           from './NetworkListService';
import { assert, crypto, excel, ProgressController, randomBytes, RevocableContext, SharedStorage, SingleColumnContainerView, StorageContext, util } from 'fgc';
import * as bcrypt                      from 'bcryptjs';
import _                                from 'lodash';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import React                            from 'react';

const STORE_FLAGS               = '.vol_flags';
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

//const debugLog = function () {}
const debugLog = function ( ...args ) { console.log ( 'APP STATE:', ...args ); }

//================================================================//
// AppStateService
//================================================================//
export class AppStateService {

    //----------------------------------------------------------------//
    assertPassword ( password ) {
        if ( !this.checkPassword ( password )) throw new Error ( 'Invalid wallet password.' );
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
    constructor () {

        extendObservable ( this, {
            accountInfo:            false,
        });

        this.revocable          = new RevocableContext ();
        this.appDB              = new AppDB ();
        this.networkList        = new NetworkListService ( this );

        const flags = {
            promptFirstNetwork:         true,
            promptFirstAccount:         true,
            promptFirstTransaction:     true,
        };

        this.networks   = {};
        this.consensus  = {};

        const storageContext = new StorageContext ();

        storageContext.persist ( this, 'flags',             STORE_FLAGS,                flags );
        storageContext.persist ( this, 'passwordHash',      STORE_PASSWORD_HASH,        '' );
        storageContext.persist ( this, 'session',           STORE_SESSION,              this.makeSession ( false ));

        this.storage = storageContext;
    }

    //----------------------------------------------------------------//
    @action
    deleteStorage () {

        this.storage.clear ();
        indexedDB.deleteDatabase ( 'volwal' );
    }

    //----------------------------------------------------------------//
    finalize () {

        this.appDB.finalize ();
        this.storage.finalize ();
        this.revocable.finalize ();
    }

    //----------------------------------------------------------------//
    @computed get
    hasUser () {
        return ( this.passwordHash.length > 0 );
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
}
