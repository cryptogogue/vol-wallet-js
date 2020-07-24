// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as bitcoin from 'bitcoinjs-lib';
import { assert, excel, hooks, RevocableContext, SingleColumnContainerView, storage, util } from 'fgc';
import { action, computed, extendObservable, observe, observable } from 'mobx';
import _ from 'lodash';

//================================================================//
// AppStateService
//================================================================//
export class AccountInfoService {

    //----------------------------------------------------------------//
    constructor ( appState ) {

        this.revocable = new RevocableContext ();
        this.appState = appState;
    }

    //----------------------------------------------------------------//
    finalize () {
    }

    //----------------------------------------------------------------//
    async syncAccountInfo () {

        const appState = this.appState;

        if ( appState.accountID.length === 0 ) return;

        try {

            const accountID = appState.accountID;
            let data = await this.revocable.fetchJSON ( `${ appState.network.nodeURL }/accounts/${ accountID }` );

            if ( !data.account ) {
                const key = Object.values ( appState.account.keys )[ 0 ];
                const keyID = bitcoin.crypto.sha256 ( key.publicKeyHex ).toString ( 'hex' ).toLowerCase ();
                data = await this.revocable.fetchJSON ( `${ appState.network.nodeURL }/keys/${ keyID }/account` );
            }

            const accountInfo = data.account;
            const entitlements = data.entitlements;

            if ( accountInfo ) {

                appState.setAccountInfo ( accountInfo );
                appState.updateAccount ( accountInfo, entitlements );

                if ( accountInfo.name !== accountID ) {
                    appState.renameAccount ( accountID, accountInfo.name );
                }
            }                
        }
        catch ( error ) {
            this.appState.setAccountInfo ();
            throw error;
        }
    }
}
