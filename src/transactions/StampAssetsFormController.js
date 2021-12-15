// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { TRANSACTION_TYPE }                 from './Transaction';
import { TransactionFormController }        from './TransactionFormController';
import { StampController }                  from '../StampController';
import { Inventory, INVENTORY_FILTER_STATUS, InventoryWithFilter, makeSquap } from 'cardmotron';
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

    @observable status                  = STATUS.IDLE;
    @observable stampController         = false;
    @observable previewInventory        = false;
    @observable assetSelection          = {};

    @computed get filteredInventory     () { return this.stampController ? this.stampController.filteredInventory : false; }
    @computed get stamp                 () { return this.stampController ? this.stampController.stamp : false; }
    @computed get stampAsset            () { return this.stampController ? this.stampController.asset : false; }
    @computed get stampInventory        () { return this.stampController ? this.stampController.stampInventory : false; }

    //----------------------------------------------------------------//
    @action
    clearSelection ( selection ) {

        this.assetSelection = {};
        this.previewInventory = false;
        this.validate ();
    }

    //----------------------------------------------------------------//
    constructor ( accountService, stampController ) {
        super ();

        this.accountService     = accountService;
        this.inventoryService   = accountService.inventoryService;
        this.initialize ( accountService, TRANSACTION_TYPE.STAMP_ASSETS );

        if ( stampController ) {
            this.setStampController ( stampController );
            this.setStatus ( STATUS.FOUND );
        }
    }

    //----------------------------------------------------------------//
    async fetchStampAsync ( stampID ) {

        this.setStatus ( STATUS.BUSY );
        this.setStampController ();

        try {

            const serviceURL    = this.networkService.getServiceURL ( `assets/${ stampID }` );
            const result        = await this.revocable.fetchJSON ( serviceURL );

            if ( result && result.stamp ) {
                this.setStampController ( new StampController ( this.accountService, result.stamp, result.asset ));
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
        this.previewInventory.setSchema ( this.inventoryService.schema );

        for ( let assetID in this.assetSelection ) {

            const asset = _.cloneDeep ( this.assetSelection [ assetID ]);
            delete asset.svg;

            for ( let fieldName in this.stamp.fields ) {
                asset.fields [ fieldName ] = _.cloneDeep ( this.stamp.fields [ fieldName ]);
            }
            debugLog ( 'PREVIEW ASSET', asset );
            this.previewInventory.setAsset ( asset );
        }

        this.validate ();
    }

    //----------------------------------------------------------------//
    @action
    setStampController ( stampController ) {
        this.stampController = stampController || false;
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
