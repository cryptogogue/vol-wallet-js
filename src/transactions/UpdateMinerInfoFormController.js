// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { TransactionFormController }        from './TransactionFormController';
import _                                    from 'lodash';
import { action, observable, runInAction }  from 'mobx';
import url                                  from 'url';
import { TRANSACTION_TYPE }                 from 'vol';
import * as vol                             from 'vol';

export const MINER_INFO_STATE = {
    IDLE:   'IDLE',
    BUSY:   'BUSY',
    DONE:   'DONE',
    ERROR:  'ERROR',
};

//================================================================//
// RegisterMinerFormController
//================================================================//
export class UpdateMinerInfoFormController extends TransactionFormController {

	@observable state           = MINER_INFO_STATE.IDLE;

    @observable isBusy          = false;

    @observable motto           = false;
	@observable visage          = false;
    @observable minerURL        = false;

    @observable mottoError      = false;
    @observable minerURLError   = false;

    //----------------------------------------------------------------//
    @action
    clearMinerURL () {
        this.minerURL       = false;
        this.minerURLError  = false;
        this.validate ();
    }

    //----------------------------------------------------------------//
    @action
    clearMotto () {
        this.motto          = false;
        this.visage         = false;
        this.mottoError     = false;
        this.validate ();
    }

    //----------------------------------------------------------------//
    constructor ( accountService ) {
        super ();

        this.initialize ( accountService, TRANSACTION_TYPE.UPDATE_MINER_INFO );
    }

    //----------------------------------------------------------------//
    @action
    async setMinerURLAsync ( minerURL ) {

        this.setBusy ( true );

        try {

            const info = await this.revocable.fetchJSON ( minerURL );

            if ( info && ( info.type === 'VOL_MINING_NODE' )) {

                if ( info.isMiner && info.minerID ) {

                    let accountInfo = await this.revocable.fetchJSON ( `${ minerURL }accounts/${ info.minerID }` );
                    if ( accountInfo && accountInfo.miner ) {
                        runInAction (() => {
                            this.minerURL   = minerURL;
                        });
                    }
                }
            }
            else {
                runInAction (() => {
                    this.minerURLError  = 'Could not find a miner at URL.';
                });
            }
        }
        catch ( error ) {
            console.log ( error );
            runInAction (() => {
                this.minerURLError  = 'Could not reach URL.';
            });
        }

        this.setBusy ( false );
        this.validate ();
    }

    //----------------------------------------------------------------//
    @action
    async setMottoAsync ( motto ) {

        this.motto          = false;
        this.visage         = false;
        this.mottoError     = false;

        this.setBusy ( true );

        motto = motto || "";

        const networkService    = this.accountService.networkService;
        const consensusService  = networkService.consensusService;
        const minerURL          = this.minerURL || this.accountService.minerInfo.url;

        try {
            const result = await this.revocable.fetchJSON ( consensusService.formatServiceURL ( minerURL, `/visage`, { motto: motto }));

            runInAction (() => {
                this.motto      = motto;
                this.visage     = result && result.visage ? result.visage : false;
            });
        }
        catch ( error ) {
            runInAction (() => {
                this.mottoError  = 'Could not reach miner URL to generate visage.';
            });
        }

        this.setBusy ( false );
        this.validate ();
    }

    //----------------------------------------------------------------//
    @action
    setBusy ( isBusy ) {
        this.isBusy = isBusy;
    }

    //----------------------------------------------------------------//
    virtual_checkComplete () {
        return Boolean ( this.minerURL || ( this.motto && this.visage ));
    }

    //----------------------------------------------------------------//
    virtual_composeBody () {

        const minerInfo = {};

        if ( this.motto && this.visage ) {
            minerInfo.motto     = this.motto;
            minerInfo.visage    = this.visage;
        }

        if ( this.minerURL ) {
            minerInfo.url       = this.minerURL;
        }

        const body = {
        	accountName:   this.accountService.accountID,
        	minerInfo:     minerInfo,
        };
        return body;
    }
}
