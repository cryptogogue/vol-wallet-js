// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import _                                from 'lodash';
import { observer }                     from 'mobx-react';
import React, { useState }              from 'react';
import * as UI                          from 'semantic-ui-react';
import { Dropdown, Icon }                 from 'semantic-ui-react';
import FileSaver                        from 'file-saver';

//================================================================//
// InventorySearch
//================================================================//
export const InventoryTagsManagement = observer (( props ) => {

    const [ currentTag, setCurrentTag ]                               = useState ( '' );

    const { tags, controller} = props;

    const getSortedItemsNames = (items) => {
        let itemNamesList = [];
        for( let item of items) {
            let value = item.fields["C_NAME"].value;
            if(value) {
                itemNamesList.push(value);
            }
            else {
                itemNamesList.push(item.fields["D_NAME"].value);
            }
        }
        return _.orderBy(itemNamesList, [name => name.toLowerCase()], ['asc']);
    }

    const addItems = (items, tagName) => {
        tags.tagSelection(items, tagName, true);
        controller.clearSelection ();
    }

    const removeItems = (items, tagName) => {
        tags.tagSelection(items, tagName, false);
        controller.clearSelection ();
    }

    const getItemsForCurrentTag = () => {
       return getItemsForTag(currentTag);
    }

    const getItemsForTag = (name) =>{
        let tag = tags.getTagItems(name);
        const results = _.filter(controller.inventory.inventory.assets, function(o) { 
            return o.assetID in tag;
        });
        return results;
    }

    const exportItemsNames = () => {
        if (tags.countAssetsByTag ( currentTag ) != 0) {
            let results = getItemsForCurrentTag();
            let sortedItemNamesList = getSortedItemsNames(results);
            const blob = new Blob ([ JSON.stringify ( sortedItemNamesList, null, 4 )], { type: 'text/plain;charset=utf-8' });
            FileSaver.saveAs ( blob, currentTag + '-names.json' );
        }
    }

    const exportItems= () => {
        if (tags.countAssetsByTag ( currentTag ) != 0) {
            let results = getItemsForCurrentTag();
            const sortedItemList = _.orderBy(results, [item => item.assetID.toLowerCase()], ['asc']);
            const blob = new Blob ([ JSON.stringify ( sortedItemList, null, 4 )], { type: 'text/plain;charset=utf-8' });
            FileSaver.saveAs ( blob, currentTag + '.json' );
        }
    }

    const tagNames = tags.tagNames;

    let options = [];

    for ( let tagName of tagNames ) {
        options.push (
            <Dropdown.Item
                icon        = 'tags'
                text        = { tagName }
                onClick     = {() => { setCurrentTag( tagName );}}
            />
        );
    }

    return (
        <UI.Menu attached = 'top'>
            <Dropdown item icon = 'book' disabled = { options.length === 0 ? true : false }>
                <Dropdown.Menu>
                    {/* <Input icon = 'search' iconPosition = 'left' className = 'search' onClick = { ( e ) => e.stopPropagation ()} /> */}
                    <Dropdown.Menu scrolling>
                        <Dropdown.Header
                            content = 'Choose Tag'
                        />
                        <Dropdown.Divider />
                        { options }
                    </Dropdown.Menu>
                </Dropdown.Menu>
            </Dropdown>
            <UI.Menu.Menu>
                <Dropdown item simple
                text={!currentTag ? "<- Choose tag" : currentTag+" ("+tags.countAssetsByTag ( currentTag )+")"} 
                disabled={!currentTag}>
                <Dropdown.Menu >
                    <Dropdown.Item onClick     = {() => { tags.setFilter ( currentTag ); controller.clearSelection (); }}>Show</Dropdown.Item>
                    <Dropdown.Divider />
                    <Dropdown.Item onClick={() => {exportItemsNames()}} >Export - Names</Dropdown.Item>
                    <Dropdown.Item onClick={() => {exportItems()}} >Export</Dropdown.Item>
                </Dropdown.Menu>
                </Dropdown>
            </UI.Menu.Menu>
            <UI.Menu.Menu  position = 'right'>
                <UI.Menu.Item
                    icon        = 'minus'
                    disabled    = { controller.isPrintLayout || !controller.hasSelection || !currentTag ||  tags.countSelectedAssetsWithTag(controller.selection, currentTag) == 0  || currentTag != tags.filter}
                    onClick     = {() => { removeItems(controller.selection, currentTag)}}
                /> 
                <UI.Menu.Item
                    icon        = 'add'
                    disabled    = { controller.isPrintLayout || !controller.hasSelection || !currentTag || currentTag == tags.filter }
                    onClick     = {() => { addItems(controller.selection, currentTag)}}
                /> 
            </UI.Menu.Menu>
        </UI.Menu>
    );
});
