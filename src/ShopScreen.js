// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AccountNavigationBar, ACCOUNT_TABS }               from './AccountNavigationBar';
import { AppStateService }                                  from './services/AppStateService';
import { BuyAssetsFormController }                          from './transactions/BuyAssetsFormController';
import { CancelOfferFormController }                        from './transactions/CancelOfferFormController';
import { TransactionModal }                                 from './transactions/TransactionModal';
import * as vol                                             from './util/vol';
import { AssetModal, Inventory, InventoryView, InventoryViewController } from 'cardmotron';
import { assert, hooks, ProgressSpinner, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import _                                                    from 'lodash';
import { DateTime }                                         from 'luxon';
import { action, computed, observable }                     from 'mobx';
import { observer }                                         from 'mobx-react';
import React, { useState }                                  from 'react';
import { Redirect }                                         from 'react-router';
import * as UI                                              from 'semantic-ui-react';

const appState = AppStateService.get ();

const STATUS = {
    IDLE:               'IDLE',
    BUSY:               'BUSY',
    NOT_FOUND:          'NOT_FOUND',
    FOR_SALE:           'FOR_SALE',
    FOR_SALE_BY_SELF:   'FOR_SALE_BY_SELF',
    NOT_FOR_SALE:       'NOT_FOR_SALE',
    ERROR:              'ERROR',
};

//const debugLog = function () {}
const debugLog = function ( ...args ) { console.log ( '@SHOP:', ...args ); }

//================================================================//
// ShopScreenController
//================================================================//
class ShopScreenController {

    @observable status          = STATUS.IDLE;
    @observable inventory       = false;
    @observable info            = false;

    //----------------------------------------------------------------//
    constructor ( accountService ) {

        this.accountService     = accountService;
        this.inventoryService   = accountService.inventoryService;
        this.networkService     = accountService.networkService;
        this.revocable          = new RevocableContext ();
    }

    //----------------------------------------------------------------//
    @computed get
    expires () {
        return this.info && this.info.expiration ? DateTime.fromISO ( this.info.expiration ).toLocaleString ( DateTime.DATETIME_MED ) : '';
    }

    //----------------------------------------------------------------//
    finalize () {

        this.revocable.finalize ();
    }

    //----------------------------------------------------------------//
    async loadAsync ( assetID ) {

        try {

            const serviceURL    = this.networkService.getServiceURL ( `offers/${ assetID }` );
            const result        = await this.revocable.fetchJSON ( serviceURL );

            this.setAssets ( result.assets );

            const info = {
                assetID:    assetID,
            };

            if ( this.inventory === false ) {

                this.setStatus ( STATUS.NOT_FOUND );
            }
            else if ( result.status === STATUS.FOR_SALE ) {

                this.setStatus (( result.seller === this.accountService.accountID ) ? STATUS.FOR_SALE_BY_SELF : STATUS.FOR_SALE );
                
                info.offerID        = result.offerID;
                info.seller         = result.seller;
                info.price          = result.minimumPrice;
                info.expiration     = result.expiration;
            }
            else if ( result.status === STATUS.NOT_FOR_SALE ) {

                this.setStatus ( STATUS.NOT_FOR_SALE );
            }

            this.setInfo ( info );
        }
        catch ( error ) {
            debugLog ( error );
            this.setStatus ( STATUS.ERROR );
        }
    }

    //----------------------------------------------------------------//
    @action
    setAssets ( assets ) {

        // debugLog ( 'SETTING ASSETS', assets );

        if ( assets && assets.length ) {
            this.inventory = new Inventory ();
            this.inventory.setSchema ( this.inventoryService.schema );
            this.inventory.setAssets ( assets );
        }
        else {
            this.inventory = false;
        }
    }

    //----------------------------------------------------------------//
    @action
    setInfo ( info ) {
        this.info = info || false;
    }

    //----------------------------------------------------------------//
    @action
    setStatus ( status ) {
        this.status = status;
    }
}

//================================================================//
// ShopScreen
//================================================================//
export const ShopScreen = observer (( props ) => {

    if ( AppStateService.needsReset ()) return (<Redirect to = { '/util/reset' }/>);

    const networkID                 = util.getMatch ( props, 'networkID' );
    const accountID                 = util.getMatch ( props, 'accountID' );

    const accountService            = appState.assertAccountService ( networkID, accountID );
    const networkService            = accountService.networkService;
    const inventoryService          = accountService.inventoryService;
    const controller                = hooks.useFinalizable (() => new ShopScreenController ( accountService ));
    const progress                  = accountService.inventoryProgress;

    const inventoryViewController   = hooks.useFinalizable (() => new InventoryViewController ());

    const [ assetID, setAssetID ]                               = useState ( '' );
    const [ zoomedAssetID, setZoomedAssetID ]                   = useState ( false );
    const [ transactionController, setTransactionController ]   = useState ( false );

    const onBlur = () => {
        if ( assetID ) {
            controller.loadAsync ( assetID );
        }
    }

    const onKeyPress = ( event ) => {
        if ( event.key === 'Enter' ) {
            event.target.blur ();
        }
    }

    const onClickBuy = () => {
        setTransactionController (
            new BuyAssetsFormController (
                accountService,
                controller.info.price,
                controller.info.offerID,
                controller.inventory.assets
            )
        );
    }

    const onClickCancel = () => {
        setTransactionController (
            new CancelOfferFormController (
                accountService,
                controller.inventory.assets
            )
        );
    }

    const onCloseTransactionModal = () => {
        setTransactionController ( false );
    }

    const onAssetMagnify = ( asset ) => {
        setZoomedAssetID ( asset.assetID );
    }

    const assetIDtoAnchor = ( assetID ) => {
        const assetURL = networkService.getServiceURL ( `/assets/${ assetID }` );
        return <a href = { assetURL } target = '_blank'>{ assetID }</a>
    }

    const hasAssets = Boolean ( inventoryService.isLoaded && controller.inventory );
    const isLoading = Boolean (( inventoryService.isLoaded === false ) && progress.loading );

    inventoryViewController.setInventory ( controller.inventory );

    return (
        <div style = {{
            display: 'flex',
            flexFlow: 'column',
            height: '100vh',
        }}>
            <SingleColumnContainerView>
                <AccountNavigationBar
                    accountService          = { accountService }
                    tab                     = { ACCOUNT_TABS.SHOP }
                />
                <UI.Form>
                    <UI.Form.Input
                        fluid
                        placeholder     = 'Asset ID'
                        type            = 'string'
                        name            = 'assetID'
                        value           = { assetID }
                        onChange        = {( event ) => { setAssetID ( event.target.value )}}
                        onKeyPress      = { onKeyPress }
                        onBlur          = { onBlur }
                        disabled        = { isLoading }
                    />
                    
                    <Choose>

                        <When condition = { controller.status === STATUS.FOR_SALE }>
                            <UI.Segment>
                                <UI.Header as = 'h3'>{ `Seller: ${ controller.info.seller }` }</UI.Header>
                                <UI.Header as = 'h3'>{ `Price: ${ vol.format ( controller.info.price )}` }</UI.Header>
                                <UI.Header as = 'h3'>{ `Expires: ${ controller.expires }` }</UI.Header>
                                <UI.Button fluid color = 'green' onClick = {() => { onClickBuy ()}}>Buy</UI.Button>
                            </UI.Segment>
                        </When>

                        <When condition = { controller.status === STATUS.FOR_SALE_BY_SELF }>
                            <UI.Segment>
                                <UI.Header as = 'h3'>{ `Seller: ${ controller.info.seller }` }</UI.Header>
                                <UI.Header as = 'h3'>{ `Price: ${ vol.format ( controller.info.price )}` }</UI.Header>
                                <UI.Header as = 'h3'>{ `Expires: ${ controller.expires }` }</UI.Header>
                                <UI.Button fluid color = 'red' onClick = {() => { onClickCancel ()}}>Cancel Offer</UI.Button>
                            </UI.Segment>
                        </When>

                        <When condition = { controller.status === STATUS.NOT_FOR_SALE }>
                            <UI.Segment>
                                <UI.Header as = 'h3'>{ `Sorry, ${ controller.info.assetID } is not for sale.` }</UI.Header>
                            </UI.Segment>
                        </When>

                        <When condition = { controller.status === STATUS.NOT_FOUND }>
                            <UI.Segment>
                                <UI.Header as = 'h3'>{ `Could not find ${ controller.info.assetID }.` }</UI.Header>
                            </UI.Segment>
                        </When>

                    </Choose>
                    
                </UI.Form>
            </SingleColumnContainerView>

            <ProgressSpinner loading = { isLoading } message = { inventoryService.isLoaded ? '' : progress.message }>

                <If condition = { hasAssets }>
                    <div style = {{ flex: 1 }}>
                        <InventoryView
                            controller  = { inventoryViewController }
                            onMagnify   = { onAssetMagnify }
                        />
                    </div>
                    <AssetModal
                        controller      = { inventoryViewController }
                        assetID         = { zoomedAssetID }
                        formatAssetID   = { assetIDtoAnchor }
                        onClose         = {() => { setZoomedAssetID ( false )}}
                    />
                </If>

            </ProgressSpinner>

            <TransactionModal
                accountService      = { accountService }
                controller          = { transactionController }
                open                = { transactionController !== false }
                onClose             = { onCloseTransactionModal }
            />
        </div>
    );
});
