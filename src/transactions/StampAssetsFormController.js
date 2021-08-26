// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { TRANSACTION_TYPE }                 from './Transaction';
import { TransactionFormController }        from './TransactionFormController';
import { Inventory, INVENTORY_FILTER_STATUS, InventoryWithFilter } from 'cardmotron';
import _                                    from 'lodash';
import { action, computed, observable }     from 'mobx';

export const STATUS = {
    IDLE:               'IDLE',
    BUSY:               'BUSY',
    NOT_FOUND:          'NOT_FOUND',
    FOUND:              'FOUND',
    ERROR:              'ERROR',
};

//const debugLog = function () {}
const debugLog = function ( ...args ) { console.log ( '@STAMP:', ...args ); }

//================================================================//
// StampAssetsFormController
//================================================================//
export class StampAssetsFormController extends TransactionFormController {

    @observable status              = STATUS.IDLE;
    @observable stamp               = false;
    @observable stampAsset          = false;
    @observable filteredInventory   = false;
    @observable previewInventory    = false;
    @observable stampInventory      = false;
    @observable assetSelection      = {};

    //----------------------------------------------------------------//
    @action
    clearSelection ( selection ) {

        this.assetSelection = {};
        this.previewInventory = false;
        this.validate ();
    }

    //----------------------------------------------------------------//
    constructor ( accountService ) {
        super ();

        this.inventory = accountService.inventory;
        this.initialize ( accountService, TRANSACTION_TYPE.STAMP_ASSETS );
    }

    //----------------------------------------------------------------//
    async fetchStampAsync ( stampID ) {

        this.setStatus ( STATUS.BUSY );
        this.setStamp ( false );

        try {

            const serviceURL    = this.networkService.getServiceURL ( `assets/${ stampID }` );
            const result        = await this.revocable.fetchJSON ( serviceURL );

            if ( result && result.stamp ) {
                this.setStamp ( result.stamp, result.asset );
                this.setStatus ( STATUS.FOUND );
            }
            else {
                this.setStatus ( STATUS.NOT_FOUND );
            }
        }
        catch ( error ) {
            debugLog ( error );
            this.setStatus ( STATUS.ERROR );
        }
    }

    //----------------------------------------------------------------//
    @computed get
    selectedAssetIDs () {

        return Object.keys ( this.assetSelection );
    }

    //----------------------------------------------------------------//
    @action
    setSelection ( selection ) {

        this.assetSelection = _.cloneDeep ( selection );

        this.previewInventory = new Inventory ();
        this.previewInventory.setSchema ( this.inventory.schema );

        for ( let assetID in this.assetSelection ) {

            const asset = _.cloneDeep ( this.assetSelection [ assetID ]);
            for ( let fieldName in this.stamp.fields ) {
                asset.fields [ fieldName ] = _.cloneDeep ( this.stamp.fields [ fieldName ]);
            }
            this.previewInventory.setAsset ( asset );
        }

        this.validate ();
    }

    //----------------------------------------------------------------//
    @action
    setStamp ( stamp, asset ) {
        
        this.stamp                  = stamp || false;
        this.stampAsset             = asset || false;
        
        this.filteredInventory      = false;
        this.stampInventory         = false;
        this.previewInventory       = false;
        this.assetSelection         = {};
        
        if ( !stamp ) return;
        
        this.stampInventory = new Inventory ();
        this.stampInventory.setSchema ( this.inventory.schema );
        this.stampInventory.setAsset ( this.stampAsset );

        let qualifier = false;
        if ( stamp.qualifier ) {
            const template = JSON.parse ( stamp.qualifier );
            qualifier = squap.makeSquap ( template );
        }
        
        const availableAssets = {};
        
        for ( let assetID in this.inventory.assets ) {
            const asset = this.inventory [ assetID ];
            if ( !qualifier || qualifier.eval ({[ '' ]: asset })) {
                availableAssets [ assetID ] = true;
            }
        }

        this.filteredInventory = new InventoryWithFilter ( this.inventory, ( assetID ) => {
            return availableAssets [ assetID ] || false;
        });
    }

    //----------------------------------------------------------------//
    @action
    setStatus ( status ) {
        this.status = status;
    }

    //----------------------------------------------------------------//
    virtual_composeBody () {

        const body = {};
        
        body.stamp              = this.stampAsset.assetID;
        body.price              = this.stampAsset.owner === this.accountService.accountID ? 0 : this.stamp.price;
        body.version            = this.stamp.version;
        body.assetIdentifiers   = this.selectedAssetIDs;
        return body;
    }

    //----------------------------------------------------------------//
    virtual_decorateTransaction ( transaction ) {

        transaction.setAssetsFiltered ( this.selectedAssetIDs, INVENTORY_FILTER_STATUS.HIDDEN );
    }

    //----------------------------------------------------------------//
    virtual_checkComplete () {

        debugLog ( 'CHECK COMPLETE', this.selectedAssetIDs.length );

        return ( this.selectedAssetIDs.length > 0 );
    }

    //----------------------------------------------------------------//
    @action
    virtual_validate () {
    }
}
