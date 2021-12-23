// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import _ from 'lodash';
import { observer } from 'mobx-react';
import React, { useState } from 'react';
import * as UI from 'semantic-ui-react';
import { Dropdown } from 'semantic-ui-react';

//================================================================//
// InventoryQuickFilterPanel
//================================================================//
export const InventoryQuickFilterPanel = observer((props) => {
    
    let filters = [];
    const { controller, inventory, tags } = props;
    const hideCollapse = controller.isPrintLayout || !controller.hasDuplicates;
    const filtersInfo = [
        {
            "icon": "users",
            "text": "mortal.1",
            "description": "Mortals"
        },
        {
            "icon": "crop",
            "text": "trap.1",
            "description": "Trap"
        },
        {
            "icon": "move",
            "text": "event.1",
            "description": "Event"
        },
        {
            "icon": "idea",
            "text": "standard-mastermind.1",
            "description": "Standard Mastermind"
        },
        {
            "icon": "gem",
            "text": "item.1",
            "description": "Item"
        },
        {
            "icon": "window restore",
            "text": "standard-resource.1",
            "description": "Standard Resources"
        },
        {
            "icon": "window restore outline",
            "text": "resource.1",
            "description": "All Resources"
        },
    ];

    const normalize = str => _.toLower(_.deburr(str))

    const includesValue = (val, obj) => {
        const search = normalize(val)
        return _.some(obj, v => normalize(v).includes(search));
    }

    const onFilter = (value) => {
        const results = _.filter(inventory.inventory.assets, function (o) {
            var r = _.filter(o.fields, function (item) {
                return includesValue(value, item);
            });
            return r.length;
        });

        const foundAssests = {};

        for (let item of results) {
            foundAssests[item.assetID] = item;
        }
        const LAST_SEARCH_RESULTS = "Last Search Results";
        tags.deleteTag(LAST_SEARCH_RESULTS);
        tags.tagSelection(foundAssests, LAST_SEARCH_RESULTS, true);
        tags.setFilter(LAST_SEARCH_RESULTS);
    }

    for (let filter of filtersInfo) {
        filters.push(
            <UI.Popup key={filter.text} content={filter.description} trigger={<UI.Menu.Item
                icon={filter.icon}
                disabled={false}
                onClick={() => { onFilter(filter.text); }}
            />} />
        );
    }
    return (
        <UI.Menu attached='top'>
            <UI.Menu.Menu position='left'>
            <UI.Menu.Item
                            icon={hideCollapse ? 'circle outline' : (controller.hideDuplicates ? 'plus square' : 'minus square')}
                            disabled={hideCollapse}
                            onClick={() => { controller.setHideDuplicates(!controller.hideDuplicates) }}
                        />
                
                {filters}
                
            </UI.Menu.Menu>
        </UI.Menu>
    );
});
