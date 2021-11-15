// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import _                    from 'lodash';
import React                from 'react';
import { action, computed, observable, runInAction } from 'mobx';
import { observer }         from 'mobx-react';
import * as UI              from 'semantic-ui-react';

const PAGE_SIZE         = 8;
const PAGE_MENU_SIZE    = 4;

//================================================================//
// PagingController
//================================================================//
export class PagingController {

    @observable totalItems      = 0;
    @observable page            = 0;
    @observable pageCount       = 0;
    @observable pageMenuMin     = 0;    

    @computed get hasNextPage           () { return this.page < ( this.pageCount - 1 ); }
    @computed get hasPrevPage           () { return this.page > 0; }

    //----------------------------------------------------------------//
    constructor ( totalItems, pageSize, pageMenuSize ) {

        this.pageSize       = pageSize || PAGE_SIZE;
        this.pageMenuSize   = pageMenuSize || PAGE_MENU_SIZE;

        runInAction (() => {
            this.totalItems     = totalItems;
            this.pageCount      = Math.ceil ( totalItems / this.pageSize );
        });
    }

    //----------------------------------------------------------------//
    @action
    movePage ( advance ) {

        let next = this.page + advance;

        next = next >= this.pageCount ? this.pageCount - 1 : next;
        next = next < 0 ? 0 : next;

        if ( this.page === next ) return;
        this.page = next;

        if ( advance > 0 ) {

            if (( this.pageCount > this.pageMenuSize ) && ( this.page >= this.pageMenuMax - 1 )) {
        
                this.pageMenuMin = this.page;

                const max = this.pageCount - this.pageMenuSize;

                if ( this.pageMenuMin > max ) {
                    this.pageMenuMin = max;
                }
            }
        }
        else {
            if ( this.page < this.pageMenuMin ) {
                this.pageMenuMin = this.page > this.pageMenuSize ? this.pageMenuMin - this.pageMenuSize : 0;
            }
        }
    }

    //----------------------------------------------------------------//
    @action
    nextPage () {

        this.movePage ( 1 );
    }

    //----------------------------------------------------------------//
    @computed get
    pageItemMin () {

        return this.page * this.pageSize;
    }

    //----------------------------------------------------------------//
    @computed get
    pageItemMax () {

        const max = this.pageItemMin + this.pageSize;
        return ( max < this.totalItems ) ? max : this.totalItems;
    }

    //----------------------------------------------------------------//
    @computed get
    pageMenuMax () {

        const max = this.pageMenuMin + this.pageMenuSize;
        return max < this.pageCount ? max : this.pageCount;
    }

    //----------------------------------------------------------------//
    @action
    prevPage () {

        this.movePage ( -1 );
    }

    //----------------------------------------------------------------//
    @action
    setPage ( page ) {

        this.movePage ( page - this.page );
    }
}

//================================================================//
// PagingMenu
//================================================================//
export const PagingMenu = observer (( props ) => {

    const { controller } = props;

    const pageItems = [];
    for ( let i = controller.pageMenuMin; i < controller.pageMenuMax; ++i ) {

        pageItems.push (
            <UI.Menu.Item
                key = { i }
                as = 'a'
                onClick = {() => { controller.setPage ( i )}}
                active = { i === controller.page }
            >
                { i + 1 }
            </UI.Menu.Item>
        );
    }

    return (
        <UI.Menu floated = 'right' pagination>
            <UI.Menu.Item as = 'a' icon onClick = {() => { controller.prevPage (); }} disabled = { !controller.hasPrevPage }>
                <UI.Icon name = 'chevron left' />
            </UI.Menu.Item>
            { pageItems }
            <UI.Menu.Item as = 'a' icon onClick = {() => { controller.nextPage (); }} disabled = { !controller.hasNextPage }>
                <UI.Icon name = 'chevron right'/>
            </UI.Menu.Item>
        </UI.Menu>
    );
});
