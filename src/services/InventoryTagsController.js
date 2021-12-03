// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import _                                                    from 'lodash';
import { action, computed, observable, runInAction }        from 'mobx';
import { storage }                                          from 'fgc';

//================================================================//
// InventoryTagsController
//================================================================//
export class InventoryTagsController {

    @observable filter              = '';
    @observable tags                = {};

    //----------------------------------------------------------------//
    @action
    affirmTag ( tagName ) {
    
        if (( tagName.length > 0 ) && ( !_.has ( this.tags, tagName ))) {
            this.tags [ tagName ] = {};
            this.saveTags ();
        }
    }

    //----------------------------------------------------------------//
    constructor ( networkID ) {

        this.storageKey = `.vol.NETWORK.${ networkID }.TAGS`;

        runInAction (() => {
            this.tags           = storage.getItem ( this.storageKey, {});
        });
    }

    //----------------------------------------------------------------//
    countAssetsByTag ( tagName ) {

        const tag = this.tags [ tagName ] || {};
        return _.size ( tag );
    }

    //----------------------------------------------------------------//
    countSelectedAssetsWithTag ( selection, tagName ) {

        const tag = this.tags [ tagName ] || {};

        let count = 0;
        for ( let assetID in selection ) {
            if ( assetID in tag ) {
                count++;
            }
        }
        return count;
    }

    //----------------------------------------------------------------//
    @action
    deleteTag ( tagName ) {
        delete this.tags [ tagName ];
        this.saveTags ();
    }

    //----------------------------------------------------------------//
    @computed
    get hasTags () {
        return Object.keys ( this.tags ).length !== 0;
    }

    //----------------------------------------------------------------//
    @action
    importTags ( tags ) {
        
        this.tags = tags;
        this.saveTags ();
    }

    //----------------------------------------------------------------//
    @computed
    get tagNames () {
        return Object.keys ( this.tags ).sort ();
    }

    //----------------------------------------------------------------//
    isAssetVisible ( assetID ) {

        if ( this.filter.length === 0 ) return true;

        const tag = this.tags [ this.filter ] || {};
        return ( assetID in tag );
    }

    //----------------------------------------------------------------//
    saveTags () {

        storage.setItem ( this.storageKey, this.tags );
    }

    //----------------------------------------------------------------//
    @action
    setFilter ( filter ) {

        this.filter = filter;
    }

    //----------------------------------------------------------------//
    @action
    tagSelection ( selection, tagName, value ) {

        const tag = _.cloneDeep ( this.tags [ tagName ]) || {};
        
        if ( value ) {
            for ( let assetID in selection ) {
                tag [ assetID ] = true;
            }
        }
        else {
            for ( let assetID in selection ) {
                delete tag [ assetID ];
            }
        }

        this.tags [ tagName ] = tag;
        this.saveTags ();
    }
}
