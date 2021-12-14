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

const PAGE_SIZE = 20;

//const debugLog = function () {}
const debugLog = function ( ...args ) { console.log ( '@MKT:', ...args ); }

//================================================================//
// MarketplaceSearchControllerBase
//================================================================//
class MarketplaceSearchControllerBase {

    @observable items           = [];
    @observable page            = 0;
    @observable nextPage        = 0;

    //----------------------------------------------------------------//
    constructor ( accountService, makeItemController ) {

        this.makeItemController     = makeItemController || this._makeItemController;
        this.accountService         = accountService;
        this.networkService         = accountService.networkService;
        this.revocable              = new fgc.RevocableContext ();
    }

    //----------------------------------------------------------------//
    @action
    setItems ( items ) {

        this.items = [];
        for ( let item of items ) {
            try {
                this.items.push ( this.makeItemController ( item ));
            }
            catch ( error ) {
                console.log ( error );
            }
        }
    }

    //----------------------------------------------------------------//
    @action
    setPage ( page ) {
        this.page = page;
    }
}

//================================================================//
// MarketplaceFavoritesController
//================================================================//
export class MarketplaceFavoritesController extends MarketplaceSearchControllerBase {

    @computed get count         () { return this.favorites.length; }
    @computed get favorites     () { return this.getFavorites (); }

    //----------------------------------------------------------------//
    constructor ( accountService, getFavorites, fetchItemAsync ) {
        super ( accountService );

        this.getFavorites       = getFavorites || this._getFavorites;
        this.fetchItemAsync     = fetchItemAsync || this._fetchItemAsync;
    }

    //----------------------------------------------------------------//
    @action
    async setPageAsync ( page, force ) {

        if (( this.nextPage === page ) && ( force !== true )) return;
       
        this.nextPage = page;

        const items = [];

        const fetchItemAsync = async ( favoriteID ) => {
            const item = await this.fetchItemAsync ( favoriteID );
            if ( item ) {
                items.push ( item );
            }
        }

        const base  = page * PAGE_SIZE;
        const top   = Math.min ( base + PAGE_SIZE, this.count );

        const promises = [];
        for ( let i = base; i < top; ++i ) {
            promises.push ( fetchItemAsync ( this.favorites [ i ]));
        }
        await this.revocable.all ( promises );

        if ( this.nextPage == page ) {
            this.setPage ( page );
            this.setItems ( items );
        }
    }

    //----------------------------------------------------------------//
    start () {
        this.setPageAsync ( 0, true );
    }

    //----------------------------------------------------------------//
    @computed get
    totalPages () {
        return this.count ? Math.ceil ( this.count / PAGE_SIZE ) : 0;
    }
}

//================================================================//
// MarketplaceSearchController
//================================================================//
export class MarketplaceSearchController extends MarketplaceSearchControllerBase {

    @observable count           = 0;
    @observable token           = false;

    //----------------------------------------------------------------//
    constructor ( accountService, getURL, processResult ) {
        super ( accountService );

        this.getURL             = getURL || this._getURL;
        this.processResult      = processResult || this._processResult;
    }

    //----------------------------------------------------------------//
    @computed get
    marketplaceURL () {

        return this.getURL ( this.nextPage * PAGE_SIZE, PAGE_SIZE );
    }

    //----------------------------------------------------------------//
    @action
    async setPageAsync ( page ) {

        if ( this.nextPage == page ) return;
        this.nextPage = page;

        try {
            const result = this.processResult ( await this.revocable.fetchJSON ( this.marketplaceURL ));

            if ( result && result.items && ( this.nextPage === page )) {
                this.setPage ( page );
                this.setItems ( result.items );
            }
        }
        catch ( error ) {
            debugLog ( error );
        }
    }

    //----------------------------------------------------------------//
    async start () {

        try {
            const result = this.processResult ( await this.revocable.fetchJSON ( this.marketplaceURL ));

            if ( result && result.items ) {
                runInAction (() => {
                    this.count          = result.count;
                    this.token          = result.token;
                });
                this.setPage ( 0 );
                this.setItems ( result.items );
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
