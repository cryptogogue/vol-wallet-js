// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AccountNavigationBar, ACCOUNT_TABS }               from './AccountNavigationBar';
import { AssetModal }                                       from './AssetModal';
import { MarketplaceSearchController, MarketplaceFavoritesController } from './MarketplaceSearchController';
import { OfferView, OfferListView, OfferController, OfferAssetModal } from './OfferView';
import { AppStateService }                                  from './services/AppStateService';
import { StampController }                                  from './StampController';
import { StampAssetsFormController }                        from './transactions/StampAssetsFormController';
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
    STAMPS:             'STAMPS',
    FAVORITES:          'FAVORITES',
    LISTINGS:           'LISTINGS',
};

//const debugLog = function () {}
const debugLog = function ( ...args ) { console.log ( '@STAMPS:', ...args ); }

//================================================================//
// FavoritesController
//================================================================//
class FavoritesController extends MarketplaceFavoritesController {

    @computed get stamps        () { return this.items; }

    //----------------------------------------------------------------//
    constructor ( accountService ) {
        super ( accountService );
        this.start ();
    }

    //----------------------------------------------------------------//
    _getFavorites () {
        return this.networkService.favoriteStamps || [];
    }

    //----------------------------------------------------------------//
    async _fetchItemAsync ( favoriteID ) {

        try {
            let marketplaceURL = URL.parse ( this.networkService.marketplaceURL );
            marketplaceURL.pathname = `/stamps/${ favoriteID }`;
            marketplaceURL = URL.format ( marketplaceURL );

            const result = await this.revocable.fetchJSON ( marketplaceURL );

            if ( result && result.asset ) {
                return result.asset;
            }
        }
        catch ( error ) {
            debugLog ( error );
        }
        return false;
    }

    //----------------------------------------------------------------//
    _makeItemController ( item ) {
        return new StampController ( this.accountService, item );
    }
}

//================================================================//
// SearchController
//================================================================//
class SearchController extends MarketplaceSearchController {

    @computed get stamps        () { return this.items; }

    //----------------------------------------------------------------//
    constructor ( accountService, excludeSeller, matchSeller ) {
        super ( accountService );

        this.excludeSeller      = isNaN ( excludeSeller ) ? false : excludeSeller;
        this.matchSeller        = isNaN ( matchSeller ) ? false : matchSeller;

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

        if ( this.token ) {
            query.token = this.token;
        }

        const baseURL       = URL.parse ( this.networkService.marketplaceURL );
        baseURL.pathname    = `/stamps`;
        baseURL.query       = query;

        return URL.format ( baseURL );
    }

    //----------------------------------------------------------------//
    _makeItemController ( item ) {
        return new StampController ( this.accountService, item.stamp, item.asset );
    }

    //----------------------------------------------------------------//
    _processResult ( result ) {

        if ( !( result && result.stamps )) return false;

        return {
            items:      result.stamps,
            count:      result.count || false,
            token:      result.token || false,
        };
    }
}

//================================================================//
// StampView
//================================================================//
export const StampView = observer (( props ) => {

    const { stamp, onClickStamp, onToggleFavorite } = props;
    const [ zoomedAsset, setZoomedAsset ] = useState ( false );

    const totalAssets = stamp.filteredInventory.assetsArray.length;

    return (
        <React.Fragment>
            <UI.Card>
                <UI.Card.Content>
                    <UI.Menu
                        borderless
                        secondary
                    >
                        <UI.Menu.Item>
                            { vol.util.format ( stamp.price )}
                        </UI.Menu.Item>
                        <UI.Menu.Menu position = 'right'>
                            <UI.Menu.Item
                                icon                = { stamp.isFavorite ? 'heart' : 'heart outline' }
                                onClick             = {() => { onToggleFavorite ( stamp ); }}
                            />
                        </UI.Menu.Menu>
                    </UI.Menu>
                </UI.Card.Content>

                <UI.Card.Content textAlign = 'center'>
                    <UI.Card.Group>
                        <cardmotron.AssetCardView
                            asset               = { stamp.asset }
                            schema              = { stamp.schema }
                            onClick             = {() => { setZoomedAsset ( stamp.asset ); }}
                        />
                    </UI.Card.Group>
                </UI.Card.Content>

                <UI.Card.Content extra textAlign = 'center'>
                    <UI.Button
                        positive
                        onClick         = {() => { onClickStamp ( stamp ); }}
                        disabled        = { totalAssets === 0 }
                    >
                        Apply
                    </UI.Button>
                </UI.Card.Content>
            </UI.Card>
            <AssetModal
                networkService      = { stamp.networkService }
                schema              = { stamp.schema }
                asset               = { zoomedAsset }
                onClose             = {() => { setZoomedAsset ( false ); }}
            />
        </React.Fragment>
    );
});

//================================================================//
// StampListView
//================================================================//
export const StampListView = observer (( props ) => {

    const { controller, onClickStamp, onToggleFavorite } = props;

    const stamps = controller.stamps;

    const stampList = [];
    for ( let stamp of stamps ) {
        stampList.push (
            <StampView
                key                 = { stamp.asset.assetID }
                stamp               = { stamp }
                onClickStamp        = { onClickStamp }
                onToggleFavorite    = { onToggleFavorite }
            />
        );
    }

    return (
        <UI.Card.Group centered>
            { stampList }
        </UI.Card.Group>
    );
});

//================================================================//
// StampsScreen
//================================================================//
export const StampsScreen = observer (( props ) => {

    if ( AppStateService.needsReset ()) return (<Redirect to = { '/util/reset' }/>);

    const networkID                     = fgc.util.getMatch ( props, 'networkID' );
    const accountID                     = fgc.util.getMatch ( props, 'accountID' );

    const accountService                = appState.assertAccountService ( networkID, accountID );
    const networkService                = accountService.networkService;

    const inventoryService              = accountService.inventoryService;
    const shopSearchController          = fgc.hooks.useFinalizable (() => new SearchController ( accountService, accountService.index ));
    const favoritesSearchController     = fgc.hooks.useFinalizable (() => new FavoritesController ( accountService ));
    const listingsSearchController      = fgc.hooks.useFinalizable (() => new SearchController ( accountService, false, accountService.index ));

    const [ transactionController, setTransactionController ]   = useState ( false );
    const [ tab, setTab ]                                       = useState ( TABS.STAMPS );

    const controllersByTab = {};
    controllersByTab [ TABS.STAMPS ]        = shopSearchController;
    controllersByTab [ TABS.FAVORITES ]     = favoritesSearchController;
    controllersByTab [ TABS.LISTINGS ]      = listingsSearchController;

    const onCloseTransactionModal = () => {
        setTransactionController ( false );
    }

    const onClickStamp = ( stampController ) => {
        setTransactionController (
            new StampAssetsFormController (
                accountService,
                stampController
            )
        );
    }

    const onToggleFavorite = ( stamp ) => {
        networkService.toggleFavoriteStamp ( stamp.assetID );
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

    return (
        <React.Fragment>

            <fgc.SingleColumnContainerView>
                <AccountNavigationBar
                    accountService          = { accountService }
                    tab                     = { ACCOUNT_TABS.STAMPS }
                />
            </fgc.SingleColumnContainerView>

            <UI.Container>
                <UI.Menu tabular attached = 'top'>
                    <UI.Menu.Item
                        active      = { tab === TABS.STAMPS }
                        onClick     = {() => { setTab ( TABS.STAMPS ); }}
                        disabled    = { shopCount === 0 }
                    >
                        { `Stamps${ formatCount ( shopCount )}` }
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
                        { `My Stamps${ formatCount ( listingsCount )}` }
                    </UI.Menu.Item>
                </UI.Menu>
     
                <UI.Segment attached textAlign = 'center'>
                    <If condition = { controller.totalPages > 1 }>
                        <UI.Pagination
                            activePage          = { controller.nextPage + 1 }
                            totalPages          = { controller.totalPages }
                            onPageChange        = { onPageChange }
                        />
                    </If>
                </UI.Segment>

                <UI.Segment tertiary attached = 'bottom'>
                    <fgc.ProgressSpinner loading = { inventoryService.schema === false }>
                        <StampListView
                            controller          = { controller }
                            onClickStamp        = { onClickStamp }
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