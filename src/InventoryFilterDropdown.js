// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import _                                                    from 'lodash';
import { action, computed, extendObservable, observable }   from "mobx";
import { observer }                                         from 'mobx-react';
import React, { Fragment, useState }                        from 'react';
import { Link }                                             from 'react-router-dom';
import { Button, Checkbox, Dropdown, Grid, Icon, Input, List, Menu, Modal, Loader } from 'semantic-ui-react';
import { assert, excel, hooks, RevocableContext, SingleColumnContainerView, util } from 'fgc';

//================================================================//
// InventoryFilterDropdown
//================================================================//
export const InventoryFilterDropdown = observer (( props ) => {

    const { tags } = props;

    const tagNames = tags.tagNames;

    let options = [];

    for ( let tagName of tagNames ) {
        options.push (
            <Dropdown.Item
                disabled    = { tags.countAssetsByTag ( tagName ) === 0 ? true : false }
                key         = { tagName }
                icon        = 'tags'
                text        = { tagName }
                onClick     = {() => { tags.setFilter ( tagName )}}
            />
        );
    }

    return (
        <Dropdown item icon = 'filter' disabled = { options.length === 0 ? true : false }>
            <Dropdown.Menu>
                {/* <Input icon = 'search' iconPosition = 'left' className = 'search' onClick = { ( e ) => e.stopPropagation ()} /> */}
                <Dropdown.Menu scrolling>
                    <Dropdown.Header
                        content = 'Clear Filters'
                        onClick     = {() => { tags.setFilter ( '' )}}
                    />
                    <Dropdown.Divider />
                    { options }
                </Dropdown.Menu>
            </Dropdown.Menu>
        </Dropdown>
    );
});
