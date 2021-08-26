// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import _                                                    from 'lodash';
import { observer }                                         from 'mobx-react';
import React, { useState }                                  from 'react';
import { Button, Checkbox, Icon, Input, Menu, Modal }       from 'semantic-ui-react';

//================================================================//
// InventoryTagsDropdownItems
//================================================================//
export const InventoryTagsDropdownList = observer (( props ) => {

    const [ tagInput, setTagInput ]     = useState ( '' );
    const [ isOpen, setIsOpen ]         = useState ( false );

    const { controller, tags } = props;

    if ( !tags ) return;

    const tagNames          = tags.tagNames;
    const selectionSize     = controller.selectionSize;

    let tagList = [];
    for ( let tagName of tagNames ) {

        const tagSize           = tags.countAssetsByTag ( tagName );
        const withTag           = tags.countSelectedAssetsWithTag ( controller.selection, tagName );

        const allTagged         = (( withTag > 0 ) && ( selectionSize <= tagSize ));
        const indeterminate     = (( withTag > 0 ) && ( selectionSize > tagSize ));

        console.log ( 'TAGS', tagName, selectionSize, withTag, allTagged, indeterminate );

        tagList.push (
            <div
                key = { tagName }
                style = {{ marginBottom: '12px' }}
            >
                <Checkbox
                    label           = { tagName + ' (' + tagSize + ')' }
                    checked         = { allTagged }
                    indeterminate   = { indeterminate }
                    disabled        = { selectionSize === 0 }
                    onChange        = {( event ) => {
                        tags.tagSelection ( controller.selection, tagName, !allTagged );
                        event.stopPropagation ();
                    }}
                />
                <Button
                    floated         = 'right'
                    icon            = 'trash'
                    size            = 'mini'
                    style           = {{ marginTop: '-5px'}}
                    onClick         = {() => { tags.deleteTag ( tagName )}}
                />
            </div>
        );
    }

    return (
        <div>
            { tagList }
        </div>
    );
});

//================================================================//
// InventoryTagsDropdown
//================================================================//
export const InventoryTagsDropdown = observer (( props ) => {

    const [ tagInput, setTagInput ]     = useState ( '' );
    const [ isOpen, setIsOpen ]         = useState ( false );

    const { controller, tags } = props;

    const onTagInputKey = ( key ) => {
        if ( key === 'Enter' ) {
            tags.affirmTag ( tagInput );
            tags.tagSelection ( controller.selection, tagInput, true );
            setTagInput ( '' );
        }
    }

    return (
        <Menu.Item
            onClick = {() => { setIsOpen ( true )}}
        >
            <Icon name = 'tags'/>
                <Modal
                    style = {{ height : 'auto' }}
                    open = { isOpen }
                    onClose = {() => {
                        setIsOpen ( false );
                        controller.clearSelection ();
                    }}
                >
                    <Modal.Content>
                        <div>
                            <InventoryTagsDropdownList
                                controller      = { controller }
                                tags            = { tags }
                            />
                            <Input
                                fluid
                                maxLength = '20'
                                placeholder = 'New Tag...'
                                style = {{ marginTop: '6px' }}
                                value = { tagInput }
                                onChange = {( event ) => { setTagInput ( event.target.value )}}
                                onKeyPress = {( event ) => { onTagInputKey ( event.key )}}
                            />
                        </div>
                    </Modal.Content>
                </Modal>
        </Menu.Item>
    );
});
