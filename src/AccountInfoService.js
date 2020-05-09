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

        observe ( appState, 'accountID', ( change ) => {
            this.revocable.revokeAll ();
            this.syncAccountInfo ( 5000 );
        });
        this.syncAccountInfo ( 5000 );
    }

    //----------------------------------------------------------------//
    finalize () {

        this.revocable.finalize ();
    }

    //----------------------------------------------------------------//
    @action
    syncAccountInfo ( delay ) {

        if ( this.appState.accountID.length === 0 ) return;

        let updateInfo = async () => {

            try {
                await AccountInfoService.update ( this, this.appState );
            }
            catch ( error ) {
                this.appState.setAccountInfo ();
                throw error;
            }
        }
        this.revocable.promiseWithBackoff (() => updateInfo (), delay, true );
    }

    //----------------------------------------------------------------//
    static async update ( service, appState ) {

        const accountID = appState.accountID;
        let data = await service.revocable.fetchJSON ( `${ appState.network.nodeURL }/accounts/${ accountID }` );

        if ( !data.account ) {
            const key = Object.values ( appState.account.keys )[ 0 ];
            const keyID = bitcoin.crypto.sha256 ( key.publicKeyHex ).toString ( 'hex' ).toLowerCase ();
            data = await service.revocable.fetchJSON ( `${ appState.network.nodeURL }/keys/${ keyID }/account` );
        }

        const account = data.account;
        const entitlements = data.entitlements;

        if ( account ) {

            const accountInfo = _.cloneDeep ( appState.accountInfo || {});

            accountInfo.balance         = account.balance;
            accountInfo.nonce           = account.nonce;
            accountInfo.inventoryNonce  = account.inventoryNonce;

            if ( appState.inventoryNonce < accountInfo.inventoryNonce ) {

                const count = accountInfo.inventoryNonce - appState.inventoryNonce;
                const url = `${ appState.network.nodeURL }/accounts/${ accountID }/inventory/log/${ appState.inventoryNonce }?count=${ count }`;
                data = await service.revocable.fetchJSON ( url );

                if ( data.additions && ( data.additions.length > 0 )) {
                    accountInfo.newAssets = data.assets;
                }
                else {
                    appState.setAccountInventoryNonce ( accountInfo.inventoryNonce );
                }
            }

            appState.setAccountInfo ( accountInfo );
            appState.updateAccount ( account, entitlements );
            appState.confirmTransactions ( account.nonce );

            if ( account.name !== accountID ) {
                appState.renameAccount ( accountID, account.name );
            }
        }
    }
}
