// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AccountNavigationBar, ACCOUNT_TABS }               from './AccountNavigationBar';
import { AppStateService }                                  from './services/AppStateService';
import { BuyAssetsFormController }                          from './transactions/BuyAssetsFormController';
import { CancelOfferFormController }                        from './transactions/CancelOfferFormController';
import { TransactionModal }                                 from './transactions/TransactionModal';
import * as cardmotron                                      from 'cardmotron';
import * as fgc                                             from 'fgc';
import _                                                    from 'lodash';
import { DateTime }                                         from 'luxon';
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
// FavoritesSearchController
//================================================================//
class FavoritesSearchController {

    @observable offers          = [];
    @observable page            = 0;
    @observable nextPage        = 0;

    @computed get count         () { return this.networkService.favoriteOffers.length; }

    //----------------------------------------------------------------//
    constructor ( accountService ) {

        this.accountService     = accountService;
        this.networkService     = accountService.networkService;
        this.revocable          = new fgc.RevocableContext ();

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
            runInAction (() => {
                this.page           = page;
                this.offers         = offers;
            });
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
class ShopSearchController {

    @observable offers          = [];
    @observable page            = 0;
    @observable nextPage        = 0;
    @observable count           = 0;
    @observable token           = false;

    //----------------------------------------------------------------//
    constructor ( accountService, excludeSeller, matchSeller, all ) {

        this.accountService     = accountService;
        this.networkService     = accountService.networkService;
        this.revocable          = new fgc.RevocableContext ();

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
                    this.page           = 0;
                    this.offers         = result.offers;
                    this.count          = result.count;
                    this.token          = result.token;
                });
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
                runInAction (() => {
                    this.page           = page;
                    this.offers         = result.offers;
                });
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
// AssetModal
//================================================================//
export const AssetModal = observer (( props ) => {

    const { schema, asset, networkService, onClose } = props;

    const assetURL = networkService.getServiceURL ( `/assets/${ asset.assetID }` );

    return (
        <UI.Modal
            open
            size        = 'small'
            style       = {{ height : 'auto' }}
            onClose     = { onClose }
        >
            <UI.Modal.Content>
                <center>
                    <h3>Card Info</h3>
                    <UI.Divider/>
                    <cardmotron.AssetView
                        inches
                        asset           = { props.asset }
                        schema          = { props.schema }
                    />
                    <p>
                        <a href = { assetURL } target = '_blank'>{ asset.assetID }</a>
                    </p>
                </center>
            </UI.Modal.Content>
        </UI.Modal>
    );
});

//================================================================//
// OfferList
//================================================================//
const OfferList = observer (( props ) => {

    const { schema, offers, isOwn, isFavorite, onToggleFavorite, onClickBuy, onClickCancel } = props;

    const getStatusMessage = ( offer ) => {
        switch ( offer.closed ) {
            case 'COMPLETED': return 'Sold';
            case 'CANCELLED': return 'Cancelled';
        }
        return 'Expires in 20 days';
    }

    const getMenuColor = ( offer ) => {
        switch ( offer.closed ) {
            case 'COMPLETED': return 'green';
            case 'CANCELLED': return 'yellow';
        }
        return 'grey';
    }

    const offerList = [];
    for ( let offer of offers ) {

        const offerID = offer.offerID;

        const cards = [];
        for ( let asset of offer.assets ) {
            cards.push (
                <cardmotron.AssetCardView
                    key             = { asset.assetID }
                    asset           = { asset }
                    schema          = { schema }
                    onMagnify       = {() => { setZoomedAsset ( asset ); }}
                />
            );
        }

        const isClosed = Boolean ( offer.closed );
        const isLast = ( offerList.length === ( offers.length - 1 ));

        offerList.push (
            <div key = { offerID } style = { !isLast ? { marginBottom: '16px' } : undefined }>
                <UI.Menu
                    borderless
                    inverted
                    color       = { getMenuColor ( offer )}
                    attached    = 'top'
                >
                    <UI.Menu.Item>
                        { vol.util.format ( offer.minimumPrice )}
                    </UI.Menu.Item>
                    <UI.Menu.Item>
                        { getStatusMessage ( offer )}
                    </UI.Menu.Item>
                    <UI.Menu.Menu position = 'right'>
                        <UI.Menu.Item
                            icon        = { isFavorite ( offer ) ? 'heart' : 'heart outline' }
                            onClick     = {() => { onToggleFavorite ( offer ); }}
                        />
                    </UI.Menu.Menu>
                </UI.Menu>    
                <UI.Segment attached>
                    <UI.Card.Group centered>
                        { cards }
                    </UI.Card.Group>
                </UI.Segment>
                <UI.Segment attached = 'bottom' textAlign = 'right'>
                    <Choose>
                        <When condition = { isOwn ( offer )}>
                            <UI.Button
                                negative
                                onClick         = {() => { onClickCancel ( offer ); }}
                                disabled        = { isClosed }
                                style           = { isClosed ? { visibility: 'hidden' } : {}}
                            >
                                Cancel
                            </UI.Button>
                        </When>
                        <Otherwise>
                            <UI.Button
                                positive
                                onClick         = {() => { onClickBuy ( offer ); }}
                                disabled        = { isClosed }
                            >
                                Buy
                            </UI.Button>
                        </Otherwise>
                    </Choose>
                </UI.Segment>
            </div>
        );
    }

    return (
        <React.Fragment>
            { offerList }
        </React.Fragment>
    );
});

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

    const [ zoomedAsset, setZoomedAsset ]                       = useState ( false );
    const [ transactionController, setTransactionController ]   = useState ( false );
    const [ favorites, setFavorites ]                           = useState ( false );
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

    const onToggleFavorite = ( offer ) => {
        networkService.toggleFavoriteOffer ( offer.offerID );
        setFavorites ( networkService.favoriteOffers );
        favoritesSearchController.setPageAsync ( favoritesSearchController.nextPage, true );
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
                offer.assets
            )
        );
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
                    <If condition = { inventoryService.isLoaded }>
                        <OfferList
                            schema              = { inventoryService.schema }
                            offers              = { controller.offers }
                            isOwn               = { isOwn }
                            isFavorite          = { isFavorite }
                            onToggleFavorite    = { onToggleFavorite }
                            onClickBuy          = { onClickBuy }
                            onClickCancel       = { onClickCancel }
                        />
                    </If>
                </UI.Segment>
     
            </UI.Container>

            <TransactionModal
                accountService      = { accountService }
                controller          = { transactionController }
                open                = { transactionController !== false }
                onClose             = { onCloseTransactionModal }
            />

            <If condition = { zoomedAsset }>
                <AssetModal
                    schema              = { inventoryService.schema }
                    asset               = { zoomedAsset }
                    networkService      = { networkService }
                    onClose             = {() => { setZoomedAsset ( false ); }}
                />
            </If>
        </React.Fragment>
    );
});
