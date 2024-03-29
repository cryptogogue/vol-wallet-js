// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AccountNavigationBar, ACCOUNT_TABS }               from './AccountNavigationBar';
import { OfferView, OfferListView, OfferController, OfferAssetModal } from './OfferView';
import { MarketplaceSearchController, MarketplaceFavoritesController } from './MarketplaceSearchController';
import { AppStateService }                                  from './services/AppStateService';
import { BuyAssetsFormController }                          from './transactions/BuyAssetsFormController';
import { CancelOfferFormController }                        from './transactions/CancelOfferFormController';
import { TransactionModal }                                 from './transactions/TransactionModal';
import * as cardmotron                                      from 'cardmotron';
import * as fgc                                             from 'fgc';
import _                                                    from 'lodash';
import * as luxon                                           from 'luxon';
import { action, computed, observable, runInAction }        from 'mobx';
import { observer }                                         from 'mobx-react';
import React, { useState }                                  from 'react';
import { Redirect }                                         from 'react-router';
import * as UI                                              from 'semantic-ui-react';
import URL                                                  from 'url';
import * as vol                                             from 'vol';

const appState = AppStateService.get ();

const TABS = {
    SHOP:               'SHOP',
    FAVORITES:          'FAVORITES',
    LISTINGS:           'LISTINGS',
};

//const debugLog = function () {}
const debugLog = function ( ...args ) { console.log ( '@SHOP:', ...args ); }

//================================================================//
// FavoritesController
//================================================================//
class FavoritesController extends MarketplaceFavoritesController {

    @computed get offers        () { return this.items; }

    //----------------------------------------------------------------//
    constructor ( accountService ) {
        super ( accountService );
        this.start ();
    }

    //----------------------------------------------------------------//
    _getFavorites () {
        return this.networkService.favoriteOffers;
    }

    //----------------------------------------------------------------//
    async _fetchItemAsync ( favoriteID ) {

        try {
            let marketplaceURL = URL.parse ( this.networkService.marketplaceURL );
            marketplaceURL.pathname = `/offers/${ favoriteID }`;
            marketplaceURL = URL.format ( marketplaceURL );

            const result = await this.revocable.fetchJSON ( marketplaceURL );

            if ( result && result.offer ) {
                return result.offer;
            }
        }
        catch ( error ) {
            debugLog ( error );
        }
        return false;
    }

    //----------------------------------------------------------------//
    _makeItemController ( item ) {
        return new OfferController ( this.accountService, item );
    }
}

//================================================================//
// SearchController
//================================================================//
class SearchController extends MarketplaceSearchController {

    @computed get offers        () { return this.items; }

    //----------------------------------------------------------------//
    constructor ( accountService, excludeSeller, matchSeller, all ) {
        super ( accountService );

        this.excludeSeller      = isNaN ( excludeSeller ) ? false : excludeSeller;
        this.matchSeller        = isNaN ( matchSeller ) ? false : matchSeller;
        this.all                = all || false;

        this.start ();
    }

    //----------------------------------------------------------------//
    _getURL ( nextPage, pageSize ) {

        const query = {
            base:       nextPage,
            count:      pageSize,
        };

        if ( this.excludeSeller !== false ) {
            query.exclude_seller = this.excludeSeller;
        }

        if ( this.matchSeller !== false ) {
            query.match_seller = this.matchSeller;
        }

        if ( this.all !== false ) {
            query.all = this.all;
        }

        if ( this.token ) {
            query.token = this.token;
        }

        const baseURL       = URL.parse ( this.networkService.marketplaceURL );
        baseURL.pathname    = `/offers`;
        baseURL.query       = query;

        return URL.format ( baseURL );
    }

    //----------------------------------------------------------------//
    _makeItemController ( item ) {
        return new OfferController ( this.accountService, item );
    }

    //----------------------------------------------------------------//
    _processResult ( result ) {

        if ( !( result && result.offers )) return false;

        return {
            items:      result.offers,
            count:      result.count || false,
            token:      result.token || false,
        };
    }
}

//================================================================//
// OfferListUpdateController
//================================================================//
class OfferListUpdateController {

    //----------------------------------------------------------------//
    constructor ( accountService ) {

        this.revocable          = new fgc.RevocableContext ();
        this.accountService     = accountService;
        this.networkService     = accountService.networkService;
        this.offers             = [];
        this.updateIndex        = 0;

        this.expirationUpdateLoopAsync ();
        this.offerUpdateLoopAsync ();
    }

    //----------------------------------------------------------------//
    async expirationUpdateLoopAsync () {
    
        this.updateNow ();
        this.revocable.timeout (() => { this.expirationUpdateLoopAsync ()}, 1000 );
    }

    //----------------------------------------------------------------//
    async offerUpdateLoopAsync () {
    
        if ( this.offers.length ) {

            const updateIndex = this.updateIndex % this.offers.length;
            const offerID = this.offers [ updateIndex ].offerID;

            try {
                let marketplaceURL = URL.parse ( this.networkService.marketplaceURL );
                marketplaceURL.pathname = `/offers/${ offerID }`;
                marketplaceURL = URL.format ( marketplaceURL );

                const result = await this.revocable.fetchJSON ( marketplaceURL );

                if ( result && result.offer && ( result.offer.offerID === offerID )) {
                    for ( let offer of this.offers ) {
                        if ( offer.offerID === offerID ) {
                            offer.setClosed ( result.offer.closed );
                        }
                    }
                }
            }
            catch ( error ) {
                debugLog ( error );
            }
            this.updateIndex = ( updateIndex + 1 ) % this.offers.length;
        }
        this.revocable.timeout (() => { this.offerUpdateLoopAsync ()}, 5000 );
    }

    //----------------------------------------------------------------//
    setOffers ( offers ) {

        this.offers = offers || [];
        this.updateNow ();
    }

    //----------------------------------------------------------------//
    updateNow () {

        const now = new luxon.DateTime.now ();
        for ( let offer of this.offers ) {
            offer.setNow ( now );
        }
    }
}

//================================================================//
// ShopScreenFancy
//================================================================//
export const ShopScreenFancy = observer (( props ) => {

    if ( AppStateService.needsReset ()) return (<Redirect to = { '/util/reset' }/>);

    const networkID                     = fgc.util.getMatch ( props, 'networkID' );
    const accountID                     = fgc.util.getMatch ( props, 'accountID' );

    const accountService                = appState.assertAccountService ( networkID, accountID );
    const networkService                = accountService.networkService;

    const inventoryService              = accountService.inventoryService;
    const shopSearchController          = fgc.hooks.useFinalizable (() => new SearchController ( accountService, accountService.index ));
    const favoritesSearchController     = fgc.hooks.useFinalizable (() => new FavoritesController ( accountService ));
    const listingsSearchController      = fgc.hooks.useFinalizable (() => new SearchController ( accountService, false, accountService.index, true ));
    const updateController              = fgc.hooks.useFinalizable (() => new OfferListUpdateController ( accountService ));

    const [ transactionController, setTransactionController ]   = useState ( false );
    const [ tab, setTab ]                                       = useState ( TABS.SHOP );

    const controllersByTab = {};
    controllersByTab [ TABS.SHOP ]          = shopSearchController;
    controllersByTab [ TABS.FAVORITES ]     = favoritesSearchController;
    controllersByTab [ TABS.LISTINGS ]      = listingsSearchController;

    const onCloseTransactionModal = () => {
        setTransactionController ( false );
    }

    const onClickBuy = ( offer ) => {
        setTransactionController (
            new BuyAssetsFormController (
                accountService,
                offer.minimumPrice,
                offer.offerID,
                offer.assets
            )
        );
    }

    const onClickCancel = ( offer ) => {
        setTransactionController (
            new CancelOfferFormController (
                accountService,
                offer.assets,
                offer.offerID
            )
        );
    }

    const onToggleFavorite = ( offer ) => {
        networkService.toggleFavoriteOffer ( offer.offerID );
        favoritesSearchController.setPageAsync ( favoritesSearchController.nextPage, true );
    }

    const shopCount             = shopSearchController.count;
    const favoritesCount        = favoritesSearchController.count;
    const listingsCount         = listingsSearchController.count;

    const formatCount = ( count ) => {
        return count ? ` (${ count })` : '';
    }

    const controller = controllersByTab [ tab ];
    const onPageChange = ( event, data ) => {
        controller.setPageAsync ( data.activePage - 1 );
    }
    updateController.setOffers ( controller.offers );

    return (
        <React.Fragment>

            <fgc.SingleColumnContainerView>
                <AccountNavigationBar
                    accountService          = { accountService }
                    tab                     = { ACCOUNT_TABS.SHOP }
                />
            </fgc.SingleColumnContainerView>

            <UI.Container>
                <UI.Menu tabular attached = 'top'>
                    <UI.Menu.Item
                        active      = { tab === TABS.SHOP }
                        onClick     = {() => { setTab ( TABS.SHOP ); }}
                        disabled    = { shopCount === 0 }
                    >
                        { `Shop${ formatCount ( shopCount )}` }
                    </UI.Menu.Item>
                    <UI.Menu.Item
                        active      = { tab === TABS.FAVORITES }
                        onClick     = {() => { setTab ( TABS.FAVORITES ); }}
                        disabled    = { favoritesCount === 0 }
                    >
                        { `My Favorites${ formatCount ( favoritesCount )}` }
                    </UI.Menu.Item>
                    <UI.Menu.Item
                        active      = { tab === TABS.LISTINGS }
                        onClick     = {() => { setTab ( TABS.LISTINGS ); }}
                        disabled    = { listingsCount === 0 }
                    >
                        { `My Listings${ formatCount ( listingsCount )}` }
                    </UI.Menu.Item>
                </UI.Menu>
     
                <UI.Segment attached textAlign = 'center'>
                    <If condition = { controller.totalPages > 1 }>
                        <UI.Pagination
                            activePage      = { controller.nextPage + 1 }
                            totalPages      = { controller.totalPages }
                            onPageChange    = { onPageChange }
                        />
                    </If>
                </UI.Segment>

                <UI.Segment tertiary attached = 'bottom'>
                    <fgc.ProgressSpinner loading = { inventoryService.schema === false }>
                        <OfferListView
                            controller          = { controller }
                            onClickBuy          = { onClickBuy }
                            onClickCancel       = { onClickCancel }
                            onToggleFavorite    = { onToggleFavorite }
                        />
                    </fgc.ProgressSpinner>
                </UI.Segment>
     
            </UI.Container>

            <TransactionModal
                accountService      = { accountService }
                controller          = { transactionController }
                open                = { transactionController !== false }
                onClose             = { onCloseTransactionModal }
            />
            
        </React.Fragment>
    );
});
