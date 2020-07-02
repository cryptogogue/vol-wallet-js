// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import _                                                    from 'lodash';
import { action, computed, extendObservable, observable }   from "mobx";
import { observer }                                         from 'mobx-react';
import { assert, StorageContext }                           from 'fgc';

const STORE_TAGS                = '.vol_tags';
const STORE_ASSET_TAGS          = '.vol_asset_tags';

//================================================================//
// InventoryTagsController
//================================================================//
export class InventoryTagsController {

    @observable filter              = '';

    //----------------------------------------------------------------//
    @action
    affirmTag ( tag ) {
    
        if (( tag.length > 0 ) && ( !_.has ( this.tags, tag ))) {
            this.tags [ tag ] = false;
        }
    }

    //----------------------------------------------------------------//
    constructor () {

        const storageContext = new StorageContext ();

        storageContext.persist ( this, 'tags',          STORE_TAGS,            {});
        storageContext.persist ( this, 'assetTags',     STORE_ASSET_TAGS,       {});

        this.storage = storageContext;
    }

    //----------------------------------------------------------------//
    countAssetsByTag ( tagName ) {

        let count = 0;

        for ( let assetID in this.assetTags ) {
            let tagsForAsset = this.assetTags [ assetID ];
            if ( tagsForAsset && ( tagsForAsset [ tagName ] === true )) {
                count++;
            }
        }
        return count;
    }


    //----------------------------------------------------------------//
    countSelectedAssetsWithTag ( selection, tagName ) {

        let count = 0;

        for ( let assetID in selection ) {
            let tagsForAsset = this.assetTags [ assetID ];
            if ( tagsForAsset && ( tagsForAsset [ tagName ] === true )) {
                count++;
            }
        }
        return count;
    }

    //----------------------------------------------------------------//
    @action
    deleteTag ( tag ) {
    
        delete this.tags [ tag ];

        const assetTags = _.cloneDeep ( this.assetTags );

        for ( let assetID in assetTags ) {
            const tagsForAsset = assetTags [ assetID ];
            delete tagsForAsset [ tag ];
        }

        this.assetTags = assetTags;

        if ( this.filter === tag ) {
            this.filter = '';
        }
    }

    //----------------------------------------------------------------//
    finalize () {

        this.storage.finalize ();
    }

    //----------------------------------------------------------------//
    @computed
    get hasTags () {

        return Object.keys ( this.tags ).length !== 0;
    }

    //----------------------------------------------------------------//
    @computed
    get tagNames () {
        return Object.keys ( this.tags ).sort ();
    }

    //----------------------------------------------------------------//
    isAssetVisible ( assetID ) {

        if ( this.filter.length === 0 ) return true;

        const tagsForAsset = this.assetTags [ assetID ];
        if ( tagsForAsset && ( tagsForAsset [ this.filter ] === true )) {
            return true;
        }
        return false;
    }

    //----------------------------------------------------------------//
    isTagActive ( tagName ) {
        return this.tags [ tagName ] || false;
    }

    //----------------------------------------------------------------//
    @action
    setFilter ( filter ) {

        this.filter = filter;
    }

    //----------------------------------------------------------------//
    @action
    tagSelection ( selection, tagName, value ) {

        if ( !( tagName && ( tagName.length > 0 ))) return;
        this.affirmTag ( tagName );
        value = value || false;

        const assetTags = _.cloneDeep ( this.assetTags );

        for ( let assetID in selection ) {
            if ( !_.has ( assetTags, assetID )) {
                assetTags [ assetID ] = {};
            }
            assetTags [ assetID ][ tagName ] = value;
        }
        this.assetTags = assetTags;
    }

    //----------------------------------------------------------------//
    @action
    toggleTag ( tagName ) {

        if ( _.has ( this.tags, tagName )) {
            this.tags [ tagName ] = !this.tags [ tagName ];
        }
    }
}
