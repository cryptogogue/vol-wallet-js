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
export class RegisterMinerFormController extends TransactionFormController {

	@observable state = MINER_INFO_STATE.IDLE;

	@observable url 		= '';
	@observable minerID 	= '';
	@observable motto 		= '';
	@observable publicKey 	= false;
	@observable visage 		= false;

    //----------------------------------------------------------------//
    constructor ( accountService ) {
        super ();

        this.initialize ( accountService, TRANSACTION_TYPE.REGISTER_MINER );
    }

    //----------------------------------------------------------------//
    @action
    fetchNodeInfo ( url ) {

    	this.url 	= url;
        this.state 	= MINER_INFO_STATE.BUSY;

        const doUpdate = async () => {

            try {
                const info = await this.revocable.fetchJSON ( `${ url }/node` );

                const node = info && info.node;

                runInAction (() => {

                    this.state 		= MINER_INFO_STATE.DONE;

                    this.url 		= url;
                    this.minerID	= node ? node.minerID : '';
                    this.motto		= node ? node.motto : '';
                    this.publicKey	= node ? node.publicKey : '';
                    this.visage		= node ? node.visage : '';
                });

                this.validate ();
            }
            catch ( error ) {
                console.log ( error );
                runInAction (() => {
                    this.state = MINER_INFO_STATE.ERROR;
                });
            }
        }
        doUpdate ();
    }

    //----------------------------------------------------------------//
    @action
    reset () {

        this.url = '';
        this.state = MINER_INFO_STATE.IDLE;
    }

    //----------------------------------------------------------------//
    virtual_checkComplete () {

        return Boolean ( this.url );
    }

    //----------------------------------------------------------------//
    virtual_composeBody () {

        const body = {
        	accountName: 	this.minerID,
        	minerInfo: {
        		url: 		this.url,
        		key: 		this.publicKey,
        		motto: 		this.motto,
        		visage: 	this.visage,
        	},
        };
        return body;
    }

    //----------------------------------------------------------------//
    @action
    virtual_validate () {

    	console.log ( 'VALIDATE' );
    	console.log ( this.url );
    	console.log ( this.minerID );
    	console.log ( this.motto );
    	console.log ( this.publicKey );
    	console.log ( this.visage );

    	const isNode = this.url && this.minerID && this.publicKey && this.visage;

    	if ( this.url && !isNode ) {
            this.isErrorFree = false;
        }
    }
}
