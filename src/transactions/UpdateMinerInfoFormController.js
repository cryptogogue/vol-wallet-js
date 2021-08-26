// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { TRANSACTION_TYPE }                 from './Transaction';
import { TransactionFormController }        from './TransactionFormController';
import _                                    from 'lodash';
import { action, observable, runInAction }  from 'mobx';

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

	@observable state = MINER_INFO_STATE.IDLE;

    @observable motto       = false;
	@observable visage 		= false;

    //----------------------------------------------------------------//
    constructor ( accountService ) {
        super ();

        this.initialize ( accountService, TRANSACTION_TYPE.UPDATE_MINER_INFO );
    }

    //----------------------------------------------------------------//
    @action
    reset ( state ) {
        this.state      = state || MINER_INFO_STATE.IDLE;
        this.motto      = false;
        this.visage     = false;
    }

    //----------------------------------------------------------------//
    @action
    async setMottoAsync ( motto ) {

        motto = motto || "";

        this.state  = MINER_INFO_STATE.BUSY;

        const networkService = this.accountService.networkService;
        const minerInfo = this.accountService.minerInfo;

        try {
            const result = await this.revocable.fetchJSON ( networkService.formatServiceURL ( minerInfo.url, `/visage`, { motto: motto }));

            runInAction (() => {
                this.state      = MINER_INFO_STATE.DONE;
                this.motto      = motto;
                this.visage     = result && result.visage ? result.visage : false;
            });

            this.validate ();
        }
        catch ( error ) {
            console.log ( error );
            this.reset ( MINER_INFO_STATE.ERROR );
        }
    }

    //----------------------------------------------------------------//
    virtual_checkComplete () {

        return Boolean ( this.visage );
    }

    //----------------------------------------------------------------//
    virtual_composeBody () {

        const body = {
        	accountName: 	this.accountService.accountID,
        	minerInfo: {
        		motto: 		this.motto,
        		visage: 	this.visage,
        	},
        };
        return body;
    }
}
