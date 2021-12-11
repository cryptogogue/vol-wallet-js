// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AccountNavigationBar, ACCOUNT_TABS }               from './AccountNavigationBar';
import { OfferView, OfferListView, OfferController, OfferAssetModal } from './OfferView';
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

const PAGE_SIZE = 20;

//const debugLog = function () {}
const debugLog = function ( ...args ) { console.log ( '@SHOP:', ...args ); }

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
// SearchController
//================================================================//
class SearchController {

    @observable offers          = [];
    @observable page            = 0;
    @observable nextPage        = 0;

    //----------------------------------------------------------------//
    constructor ( accountService ) {

        this.accountService     = accountService;
        this.networkService     = accountService.networkService;
        this.revocable          = new fgc.RevocableContext ();
    }

    //----------------------------------------------------------------//
    @action
    setOffers ( offers ) {

        this.offers = [];
        for ( let offer of offers ) {
            this.offers.push ( new OfferController ( this.accountService, offer ));
        }
    }

    //----------------------------------------------------------------//
    @action
    setPage ( page ) {
        this.page = page;
    }
}

//================================================================//
// FavoritesSearchController
//================================================================//
class FavoritesSearchController extends SearchController {

    @computed get count         () { return this.networkService.favoriteOffers.length; }

    //----------------------------------------------------------------//
    constructor ( accountService ) {
        super ( accountService );

        this.setPageAsync ( 0, true );
    }

    //----------------------------------------------------------------//
    @action
    async setPageAsync ( page, force ) {

        if (( this.nextPage === page ) && ( force !== true )) return;
       
        this.nextPage = page;

        const offers = [];

        const fetchOfferAsync = async ( offerID ) => {

            try {
                let marketplaceURL = URL.parse ( this.networkService.marketplaceURL );
                marketplaceURL.pathname = `/offers/${ offerID }`;
                marketplaceURL = URL.format ( marketplaceURL );

                const result = await this.revocable.fetchJSON ( marketplaceURL );

                if ( result && result.offer ) {
                    offers.push ( result.offer );
                }
            }
            catch ( error ) {
                debugLog ( error );
            }
        }

        const base = page * PAGE_SIZE;
        const top = (( base + PAGE_SIZE ) < this.count ) ? base + PAGE_SIZE : this.count;

        const promises = [];
        for ( let i = base; i < top; ++i ) {
            promises.push ( fetchOfferAsync ( this.networkService.favoriteOffers [ i ]));
        }
        await this.revocable.all ( promises );

        if ( this.nextPage == page ) {
            this.setPage ( page );
            this.setOffers ( offers );
        }
    }

    //----------------------------------------------------------------//
    @computed get
    totalPages () {
        return this.count ? Math.ceil ( this.count / PAGE_SIZE ) : 0;
    }
}

//================================================================//
// ShopSearchController
//================================================================//
class ShopSearchController extends SearchController {

    @observable count           = 0;
    @observable token           = false;

    //----------------------------------------------------------------//
    constructor ( accountService, excludeSeller, matchSeller, all ) {
        super ( accountService );

        this.excludeSeller      = isNaN ( excludeSeller ) ? false : excludeSeller;
        this.matchSeller        = isNaN ( matchSeller ) ? false : matchSeller;
        this.all                = all || false;

        this.initAsync ();
    }

    //----------------------------------------------------------------//
    async initAsync () {

        try {
            const result = await this.revocable.fetchJSON ( this.marketplaceURL );

            if ( result && result.offers ) {
                runInAction (() => {
                    this.count          = result.count;
                    this.token          = result.token;
                });
                this.setPage ( 0 );
                this.setOffers ( result.offers );
            }
        }
        catch ( error ) {
            debugLog ( error );
        }
    }

    //----------------------------------------------------------------//
    @computed get
    marketplaceURL () {

        const query = {
            base:       this.nextPage * PAGE_SIZE,
            count:      PAGE_SIZE,
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
    @action
    async setPageAsync ( page ) {

        if ( this.nextPage == page ) return;
        this.nextPage = page;

        try {
            const result = await this.revocable.fetchJSON ( this.marketplaceURL );

            if ( result && result.offers && ( this.nextPage === page )) {
                this.setPage ( page );
                this.setOffers ( result.offers );
            }
        }
        catch ( error ) {
            debugLog ( error );
        }
    }

    //----------------------------------------------------------------//
    @computed get
    totalPages () {
        return this.count ? Math.ceil ( this.count / PAGE_SIZE ) : 0;
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
    const shopSearchController          = fgc.hooks.useFinalizable (() => new ShopSearchController ( accountService, accountService.index ));
    const favoritesSearchController     = fgc.hooks.useFinalizable (() => new FavoritesSearchController ( accountService ));
    const listingsSearchController      = fgc.hooks.useFinalizable (() => new ShopSearchController ( accountService, false, accountService.index, true ));
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

    const isOwn = ( offer ) => {
        return offer.sellerIndex === accountService.index;
    }

    const isFavorite = ( offer ) => {
        return networkService.isFavoriteOffer ( offer.offerID );
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
    const favoritesCount        = networkService.favoriteOffers.length;
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
