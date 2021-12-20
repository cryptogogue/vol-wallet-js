// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import _                                from 'lodash';
import { observer }                     from 'mobx-react';
import React, { useState }              from 'react';
import * as UI                          from 'semantic-ui-react';

//================================================================//
// InventorySearch
//================================================================//
export const InventorySearch = observer (( props ) => {

    const [ searchString, setSearchString ]                               = useState ( '' );

    const { inventory, tags} = props;

    const normalize = str => _.toLower(_.deburr(str))

    const includesValue = (val, obj) => {
    const search = normalize(val)
    return _.some(obj, v => normalize(v).includes(search));
    }

    const onSearchInputKey = ( key, value) => {
        if ( key === 'Enter' ) {
            let search = searchString;
            if(value) {
                search = value;
            }

            const results = _.filter(inventory.inventory.assets, function(o) { 
                var r=_.filter(o.fields,function(item){
                    return includesValue(search, item);
                });
                return r.length;
             });

             const foundAssests = {};

             for ( let item of results ) {
                foundAssests [ item.assetID ] = item;
             }
             const LAST_SEARCH_RESULTS = "Last Search Results";
             tags.deleteTag(LAST_SEARCH_RESULTS);
             tags.tagSelection ( foundAssests, LAST_SEARCH_RESULTS , true );
             tags.setFilter ( LAST_SEARCH_RESULTS );
        }
    }

    return (
        <UI.Menu attached = 'top'>
            <UI.Menu.Item>
            <UI.Form.Input
            icon='search'
                            placeholder     = 'Search ...'
                            type            = 'string'
                            name            = 'searchString'
                            value           = { searchString }
                            onChange        = {( event ) => { setSearchString ( event.target.value )}}
                            onKeyPress      = { ( event ) => { onSearchInputKey ( event.key , searchString )} }
                            disabled        = { false }
                        />
            </UI.Menu.Item>
            <UI.Menu.Menu position = 'right'>
                <UI.Menu.Item
                    icon        = 'boxes'
                    disabled    = { false }
                    onClick     = {() => { onSearchInputKey("Enter", "Booster Pack");}}
                /> 
                <UI.Menu.Item
                    icon        = 'box'
                    disabled    = { false }
                    onClick     = {() => { onSearchInputKey("Enter", "Booster Box");}}
                />
            </UI.Menu.Menu>
        </UI.Menu>
    );
});
