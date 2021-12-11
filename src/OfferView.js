// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AccountNavigationBar, ACCOUNT_TABS }               from './AccountNavigationBar';
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

//================================================================//
// OfferController
//================================================================//
export class OfferController {

    @observable     offerID;
    @observable     sellerIndex;
    @observable     assets;
    @observable     minimumPrice;
    @observable     expiration;
    @observable     now;
    @observable     closed;

    @computed get schema        () { return this.accountService.inventoryService.schema; }

    //----------------------------------------------------------------//
    constructor ( accountService, offer ) {
    
        this.accountService = accountService;
        this.networkService = accountService.networkService;

        this.wtf = offer.expiration;

        runInAction (() => {
            this.offerID            = offer.offerID;
            this.sellerIndex        = offer.sellerIndex;
            this.assets             = offer.assets;
            this.minimumPrice       = offer.minimumPrice;
            this.expiration         = luxon.DateTime.fromISO ( offer.expiration ).toLocal ();
            this.now                = luxon.DateTime.now ();
            this.closed             = offer.closed;
        });
    }

    //----------------------------------------------------------------//
    @computed get
    hasAssets () {

        const inventoryService = this.accountService.inventoryService;
        for ( let asset of this.assets ) {
            if ( _.has ( inventoryService.assets, asset.assetID )) return true;
        }
        return false;
    }

    //----------------------------------------------------------------//
    @computed get
    isExpired () {
        return this.expiration <= this.now;
    }

    //----------------------------------------------------------------//
    @computed get
    isFavorite () {
        return this.networkService.isFavoriteOffer ( this.offerID );
    }

    //----------------------------------------------------------------//
    @computed get
    isOwn () {
        return this.sellerIndex === this.accountService.index;
    }

    //----------------------------------------------------------------//
    @computed get
    isPending () {
        return !( this.isExpired || this.closed );
    }

    //----------------------------------------------------------------//
    @computed get
    purchasePending () {
        const offerIDs = this.accountService.transactionQueue.pendingOfferIDs;
        if ( offerIDs.includes ( this.offerID )) return true;
        return false;
    }

    //----------------------------------------------------------------//
    @action
    setClosed ( closed ) {

        this.closed = closed;
    }

    //----------------------------------------------------------------//
    @action
    setNow ( now ) {

        this.now = now;
    }

    //----------------------------------------------------------------//
    @computed get
    statusColor () {

        if ( this.hasAssets && !this.isOwn ) return 'green';

        if ( this.closed ) {
            switch ( this.closed ) {
                case 'COMPLETED': return 'green';
                case 'CANCELLED': return 'yellow';
            }
        }
        if ( this.isExpired ) return 'red';
        return 'grey';
    }

    //----------------------------------------------------------------//
    @computed get
    statusString () {

        if ( this.hasAssets && !this.isOwn ) return 'Purchased';

        if ( this.closed ) {
            switch ( this.closed ) {
                case 'COMPLETED': return 'Sold';
                case 'CANCELLED': return 'Cancelled';
            }
        }

        if ( this.isExpired ) return 'Expired';

        const diff = this.expiration.diff ( this.now, [ 'days', 'hours', 'minutes', 'seconds' ]).toObject ();

        if ( diff.days === 0 ) {
            return `${ diff.hours }:${ diff.minutes }:${ Math.floor ( diff.seconds )}`;
        }

        return `Expires: ${ this.expiration.toLocaleString ( luxon.DateTime.DATETIME_SHORT )}`;
    }
}

//================================================================//
// OfferAssetModal
//================================================================//
export const OfferAssetModal = observer (( props ) => {

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
// OfferView
//================================================================//
export const OfferView = observer (( props ) => {

    const { offer, onClickBuy, onClickCancel, onToggleFavorite, isLast } = props;
    const [ zoomedAsset, setZoomedAsset ] = useState ( false );

    const offerID = offer.offerID;

    const cards = [];
    for ( let asset of offer.assets ) {
        cards.push (
            <cardmotron.AssetCardView
                key             = { asset.assetID }
                asset           = { asset }
                schema          = { offer.schema }
                onMagnify       = {() => { setZoomedAsset ( asset ); }}
            />
        );
    }

    const isClosedOrExpired = !offer.isPending;

    return (
        <React.Fragment>
            <div style = { !isLast ? { marginBottom: '16px' } : undefined }>
                <UI.Menu
                    borderless
                    inverted
                    color       = { offer.statusColor }
                    attached    = 'top'
                >
                    <UI.Menu.Item>
                        { vol.util.format ( offer.minimumPrice )}
                    </UI.Menu.Item>
                    <UI.Menu.Item>
                        { offer.statusString }
                    </UI.Menu.Item>
                    <UI.Menu.Menu position = 'right'>
                        <UI.Menu.Item
                            icon                = { offer.isFavorite ? 'heart' : 'heart outline' }
                            onClick             = {() => { onToggleFavorite ( offer ); }}
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
                        <When condition = { offer.isOwn }>
                            <UI.Button
                                negative
                                onClick         = {() => { onClickCancel ( offer ); }}
                                disabled        = { isClosedOrExpired }
                                style           = { isClosedOrExpired ? { visibility: 'hidden' } : {}}
                            >
                                Cancel
                            </UI.Button>
                        </When>
                        <Otherwise>
                            <UI.Button
                                positive
                                onClick         = {() => { onClickBuy ( offer ); }}
                                disabled        = { offer.hasAssets || offer.purchasePending || isClosedOrExpired }
                                style           = { offer.hasAssets ? { visibility: 'hidden' } : {}}
                            >
                                Buy
                            </UI.Button>
                        </Otherwise>
                    </Choose>
                </UI.Segment>
            </div>
            <If condition = { zoomedAsset }>
                <OfferAssetModal
                    schema              = { offer.schema }
                    asset               = { zoomedAsset }
                    networkService      = { offer.networkService }
                    onClose             = {() => { setZoomedAsset ( false ); }}
                />
            </If>
        </React.Fragment>
    );
});

//================================================================//
// OfferListView
//================================================================//
export const OfferListView = observer (( props ) => {

    const { controller, onClickBuy, onClickCancel, onToggleFavorite } = props;

    const offers = controller.offers;

    const offerList = [];
    for ( let offer of offers ) {

        const isLast = ( offerList.length === ( offers.length - 1 ));

        offerList.push (
            <OfferView
                key                 = { offer.offerID }
                offer               = { offer }
                onClickBuy          = { onClickBuy }
                onClickCancel       = { onClickCancel }
                onToggleFavorite    = { onToggleFavorite }
                isLast              = { isLast }
            />
        );
    }

    return (
        <React.Fragment>
            { offerList }
        </React.Fragment>
    );
});
