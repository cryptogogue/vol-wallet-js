// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import _                                                    from 'lodash';
import { action, computed, observable, runInAction }        from 'mobx';
import { storage }                                          from 'fgc';

//================================================================//
// InventoryFiltersController
//================================================================//
export class InventoryFiltersController {

    @observable filter              = '';
    @observable filters                = [];

    //----------------------------------------------------------------//
    constructor ( networkID ) {

        this.storageKey = `.vol.NETWORK.${ networkID }.ITEM_FILTERS`;

        runInAction (() => {
            this.filters           = storage.getItem ( this.storageKey, []);
        });
    }

    getFilter(name) {
        return _.filter( this.filters,function(item){
            return item.text === name;
        });
    }

    getFilters() {
        return _.cloneDeep ( this.filters) || [];
     }

    //----------------------------------------------------------------//
    @action
    deleteFilter ( name ) {
        _.remove( this.filters,function(item){
            return item.text === name;
        });
        this.saveFilters ();
    }

    //----------------------------------------------------------------//
    @computed
    get hasFilters () {
        return Object.keys ( this.filters ).length !== 0;
    }

    //----------------------------------------------------------------//
    @action
    importFilters ( items ) {
        
        this.filters = items;
        this.saveFilters ();
    }

    @action
    addFilter ( item ) {
        
        this.filters.push(item);
        this.saveFilters ();
    }

    //----------------------------------------------------------------//
    @computed
    get filterNames () {
        return Object.keys ( this.filters ).sort ();
    }


    //----------------------------------------------------------------//
    saveFilters () {
        storage.setItem ( this.storageKey, this.filters );
    }

    //----------------------------------------------------------------//
    @action
    setFilter ( name ) {
        this.filter = name;
    }

    getFilter () {
        return this.filter;
    }
}
