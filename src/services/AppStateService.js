// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AppDB }                        from './AppDB';
import { NetworkStateService }          from './NetworkStateService';
import { assert, crypto, excel, ProgressController, randomBytes, RevocableContext, SharedStorage, SingleColumnContainerView, StorageContext, util } from 'fgc';
import * as bcrypt                      from 'bcryptjs';
import _                                from 'lodash';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import React                            from 'react';

const STORE_FLAGS               = '.vol.flags';
const STORE_NETWORK_IDS         = '.vol.networkIDs';
const STORE_PASSWORD_HASH       = '.vol.passwordHash';
const STORE_SESSION             = '.vol.session';

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
const debugLog = function ( ...args ) { console.log ( '@APP STATE:', ...args ); }

//================================================================//
// AppStateService
//================================================================//
export class AppStateService {

    @observable networksByID    = {};

    //----------------------------------------------------------------//
    @action
    affirmNetwork ( networkID, identity, genesis, nodeURL ) {

        debugLog ( 'affirm network:', networkID );

        const networkService = this.networksByID [ networkID ] || new NetworkStateService ( this, networkID );

        if ( identity && nodeURL ) {
            networkService.network.nodeURL      = nodeURL;
            networkService.network.identity     = identity;
            networkService.network.genesis      = genesis;
        }

        this.networksByID [ networkID ] = networkService;

        if ( !this.networkIDs.includes ( networkID )) {
            this.networkIDs.push ( networkID );
        }
    }

    //----------------------------------------------------------------//
    @action
    assertAccountService ( networkID, accountID ) {

        const networkService = this.assertNetworkService ( networkID );
        return networkService.assertAccountService ( accountID );
    }

    //----------------------------------------------------------------//
    @action
    assertNetworkService ( networkID ) {

        if ( !this.hasNetwork ( networkID )) throw new Error ( `Network not found: ${ networkID }` );
        return this.networksByID [ networkID ];
    }

    //----------------------------------------------------------------//
    assertPassword ( password ) {
        if ( !this.checkPassword ( password )) throw new Error ( 'Invalid wallet password.' );
    }

    //----------------------------------------------------------------//
    @action
    changePassword ( password, newPassword ) {

        this.assertPassword ( password );

        for ( let networkID in this.networksByID ) {
            const network = this.networksByID [ networkID ];

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

        debugLog ( 'CONSTRUCT!' );

        extendObservable ( this, {
            accountInfo:            false,
        });

        this.revocable          = new RevocableContext ();
        this.storage            = new StorageContext ();
        this.appDB              = new AppDB ();

        const flags = {
            promptFirstNetwork:         true,
            promptFirstAccount:         true,
            promptFirstTransaction:     true,
        };

        this.storage.persist ( this, 'flags',               STORE_FLAGS,                flags );
        this.storage.persist ( this, 'passwordHash',        STORE_PASSWORD_HASH,        '' );
        this.storage.persist ( this, 'session',             STORE_SESSION,              this.makeSession ( false ));
        this.storage.persist ( this, 'networkIDs',          STORE_NETWORK_IDS,          []);

        console.log ( 'NETWORK IDS:', JSON.stringify ( this.networkIDs ));

        for ( let networkID of this.networkIDs ) {
            debugLog ( 'loading network', networkID );
            this.affirmNetwork ( networkID );
        }
        debugLog ( 'DONE!' );
    }

    //----------------------------------------------------------------//
    @action
    deleteNetwork ( networkID ) {

        if ( !this.networkIDs.includes ( networkID )) return;

        debugLog ( 'deleting network', networkID );

        const network = this.networksByID [ networkID ];
        
        this.networkIDs.splice ( this.networkIDs.indexOf ( networkID ), 1 );
        delete this.networksByID [ networkID ];

        network.deleteNetwork ();
    }

    //----------------------------------------------------------------//
    @action
    deleteStorage () {

        this.storage.clear ();
        indexedDB.deleteDatabase ( 'volwal' );
    }

    //----------------------------------------------------------------//
    finalize () {

        for ( let networkID in this.networksByID ) {
            this.networksByID [ networkID ].finalize ();
        }

        this.appDB.finalize ();
        this.storage.finalize ();
        this.revocable.finalize ();
    }

    //----------------------------------------------------------------//
    @action
    hasNetwork ( networkID ) {

        return _.has ( this.networksByID, networkID );
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
