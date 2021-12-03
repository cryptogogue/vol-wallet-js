// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import FileSaver                        from 'file-saver';
import * as fgc                         from 'fgc'
import _                                from 'lodash';
import { observer }                     from 'mobx-react';
import React, { useState }              from 'react';
import * as UI                          from 'semantic-ui-react';

//================================================================//
// InventoryTagsModalItems
//================================================================//
export const InventoryTagsModalList = observer (( props ) => {

    const [ tagInput, setTagInput ]         = useState ( '' );
    const [ isOpen, setIsOpen ]             = useState ( false );
    const [ tagToDelete, setTagToDelete ]   = useState ( false );

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
                <UI.Checkbox
                    label           = { tagName + ' (' + tagSize + ')' }
                    checked         = { allTagged }
                    indeterminate   = { indeterminate }
                    disabled        = { selectionSize === 0 }
                    onChange        = {( event ) => {
                        tags.tagSelection ( controller.selection, tagName, !allTagged );
                        event.stopPropagation ();
                    }}
                />
                <UI.Button
                    floated         = 'right'
                    icon            = 'trash'
                    size            = 'mini'
                    style           = {{ marginTop: '-5px'}}
                    onClick         = {() => { setTagToDelete ( tagName )}}
                />
            </div>
        );
    }

    const deleteTag = () => {
        tags.deleteTag ( tagToDelete );
        setTagToDelete ( false );
    }

    return (
        <React.Fragment>
            { tagList }
            <UI.Modal
                open = { tagToDelete !== false }
                onClose = {() => { setTagToDelete ( false ); }}
            >
                <UI.Modal.Header>Delete Tag</UI.Modal.Header>
                <UI.Modal.Content>
                    { `Are you sure you want to delete tag '${ tagToDelete }'?` }
                </UI.Modal.Content>
                <UI.Modal.Actions>
                    <UI.Button
                        negative
                        onClick         = { deleteTag }
                    >
                        Delete It
                    </UI.Button>
                </UI.Modal.Actions>
            </UI.Modal>
        </React.Fragment>
    );
});

//================================================================//
// InventoryTagsModal
//================================================================//
export const InventoryTagsModal = observer (( props ) => {

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

    const downloadTags = () => {
        const blob = new Blob ([ JSON.stringify ( tags.tags, null, 4 )], { type: 'text/plain;charset=utf-8' });
        FileSaver.saveAs ( blob, 'inventory-tags.json' );
    }

    const uploadTagsAsync = async ( text ) => {
        try {
            tags.importTags ( JSON.parse ( text ));
        }
        catch ( error ) {
            console.log ( error );
        }
    }

    return (
        <UI.Menu.Item
            onClick = {() => { setIsOpen ( true )}}
        >
            <UI.Icon name = 'tags'/>
                <UI.Modal
                    style = {{ height : 'auto' }}
                    open = { isOpen }
                    onClose = {() => {
                        setIsOpen ( false );
                        controller.clearSelection ();
                    }}
                >
                    <UI.Modal.Content>
                        <UI.Menu inverted attached = 'top'>
                            <fgc.FilePickerMenuItem
                                hideReloadButton
                                accept      = 'application/json'
                                format      = 'text'
                                icon        = { 'upload' }
                                loadFile    = { uploadTagsAsync }
                            />
                            <UI.Menu.Item
                                icon        = { 'download' }
                                onClick     = { downloadTags }
                            />
                        </UI.Menu>
                        <UI.Segment attached = 'bottom'>
                            <InventoryTagsModalList
                                controller      = { controller }
                                tags            = { tags }
                            />
                            <UI.Input
                                fluid
                                maxLength = '20'
                                placeholder = 'New Tag...'
                                style = {{ marginTop: '6px' }}
                                value = { tagInput }
                                onChange = {( event ) => { setTagInput ( event.target.value )}}
                                onKeyPress = {( event ) => { onTagInputKey ( event.key )}}
                            />
                        </UI.Segment>
                    </UI.Modal.Content>
                </UI.Modal>
        </UI.Menu.Item>
    );
});
