// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import _ from 'lodash';
import { observer } from 'mobx-react';
import React from 'react';
import * as UI from 'semantic-ui-react';
import alasql from 'alasql';
import { InventoryFiltersModal } from './InventoryFiltersModal';

//================================================================//
// InventoryQuickFilterPanel
//================================================================//
export const InventoryQuickFilterPanel = observer((props) => {

    let filters = [];
    const { controller, inventory, tags, filtersConroller } = props;

    const normalize = str => _.toLower(_.deburr(str))
    const hideCollapse = controller.isPrintLayout || !controller.hasDuplicates;
    const includesValue = (val, obj) => {
        const search = normalize(val)
        return _.some(obj, v => normalize(v).includes(search));
    }

    const selectAllVisibleAssets = () => {
        for (const item of controller.assetsArray) {
            controller.toggleAssetSelection(item);
        }
    }

    const onFilter = (value) => {
        let results = [];
        if (value.startsWith("SQL:")) {
            const sqlQuery = value.substring(value.indexOf("SQL:") + 4);
            if (results.length == 0) {
                try {
                    results = alasql(sqlQuery, [inventory.inventory.assetsArray]);
                } catch (e) {
                    console.log("@SQL_QUERY_ERROR", e.message);
                }
            }
        } else {
            results = _.filter(inventory.inventory.assets, function (o) {
                var r = _.filter(o.fields, function (item) {
                    return includesValue(value, item);
                });
                return r.length;
            });
        }

        const foundAssests = {};

        for (let item of results) {
            foundAssests[item.assetID] = item;
        }
        const LAST_SEARCH_RESULTS = "Last Search Results";
        tags.deleteTag(LAST_SEARCH_RESULTS);
        tags.tagSelection(foundAssests, LAST_SEARCH_RESULTS, true);
        tags.setFilter(LAST_SEARCH_RESULTS);
        filtersConroller.setFilter(value);
    }

    for (let filter of filtersConroller.getFilters()) {
        filters.push(
            <UI.Dropdown.Item
                icon={<UI.Icon name={filter.icon} color={filter.color ? filter.color : "gray"} />}
                disabled={false}
                text={filter.description}
                active={filtersConroller.getFilter() === filter.text}
                onClick={() => { onFilter(filter.text); }}
            />
        );
    }
    return (
        <UI.Menu attached='top'>
            <UI.Menu.Menu position='left'>
                <InventoryFiltersModal controller={controller} tags={tags} filters={filtersConroller} />
            </UI.Menu.Menu>
            <UI.Dropdown
                item
                icon={<UI.Icon name='filter' />
                }
            >
                <UI.Dropdown.Menu >
                    <UI.Dropdown.Header icon='tags' content='Choose filter' />
                    <UI.Dropdown.Menu scrolling>
                        {filtersConroller.getFilters().map((filter) => (
                            <UI.Dropdown.Item
                                icon={<UI.Icon name={filter.icon} color={filter.color ? filter.color : "gray"} />}
                                disabled={false}
                                key={filter.text}
                                text={filter.description}
                                active={filtersConroller.getFilter() === filter.text}
                                onClick={() => { onFilter(filter.text); }}
                            />
                        ))}
                    </UI.Dropdown.Menu>
                </UI.Dropdown.Menu>
            </UI.Dropdown>
            <UI.Menu.Menu position='right'>
                <UI.Popup content={controller.hasSelection ? 'Clear selection' : 'Select All'} trigger={
                    <UI.Menu.Item
                        icon={controller.hasSelection ? 'circle' : 'circle outline'}
                        disabled={hideCollapse}
                        onClick={() => { controller.hasSelection ? controller.clearSelection() : selectAllVisibleAssets(); }}
                    />
                } />
                <UI.Popup content={hideCollapse ? 'No dup' : (controller.hideDuplicates ? 'Show duplicates' : 'Hide duplicates')} trigger={
                    <UI.Menu.Item
                        icon={hideCollapse ? 'circle outline' : (controller.hideDuplicates ? 'plus square' : 'minus square')}
                        disabled={hideCollapse}
                        onClick={() => { controller.setHideDuplicates(!controller.hideDuplicates) }}
                    />} />
            </UI.Menu.Menu>
        </UI.Menu>
    );
});
