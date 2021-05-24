// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { assert, excel, hooks, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import * as UI                              from 'semantic-ui-react';
import validator                            from 'validator';

//================================================================//
// CraftingImagePickerModalBody
//================================================================//
const CraftingImagePickerModalBody = observer (( props ) => {

    const { open, onClose, imageURL, setImageURL } = props;

    const [ input, setInput ]           = useState ( imageURL || '' );
    const [ cleanInput, setCleanInput ] = useState ( imageURL );
    const [ hasImage, setHasImage ]     = useState ( false );
    const [ urlError, setURLError ]     = useState ( false );

    let onChangeImageURL = ( url ) => {

        setInput ( url );

        if ( validator.isURL ( url, { protocols: [ 'http', 'https' ], require_protocol: true, require_tld: false })) {
            url = url.replace ( /\/+$/, '' );
            if ( url !== imageURL ) {
                setURLError ( false );
                setHasImage ( false );
                setCleanInput ( url );
            }
        }
    }

    const onSave = () => {
        setImageURL ( cleanInput );
        onClose ();
    }

    const testEnabled = Boolean ( imageURL );

    return (
        <UI.Modal
            closeIcon
            onClose = { onClose }
            open = { open }
        >
            <UI.Modal.Header>{ `Set Image` }</UI.Modal.Header>
            
            <UI.Modal.Content>
                <UI.Form>
                    <UI.Form.Field>
                        <UI.Input
                            fluid
                            placeholder     = 'Image URL'
                            type            = 'url'
                            value           = { input }
                            onChange        = {( event ) => { onChangeImageURL ( event.target.value )}}
                        />
                        { urlError && <UI.Label pointing prompt>{ urlError }</UI.Label> }
                    </UI.Form.Field>

                    <If condition = { Boolean ( cleanInput )}>
                        <UI.Form.Field>
                            <UI.Segment>
                                <UI.Image
                                    fluid
                                    src         = { cleanInput }
                                    onLoad      = {() => { setHasImage ( true )}}
                                    onError     = {() => { setURLError ( 'Error loading image.' )}}
                                />
                            </UI.Segment>
                        </UI.Form.Field>
                    </If>
                </UI.Form>

            </UI.Modal.Content>

            <UI.Modal.Actions>

                <UI.Button
                    negative
                    onClick = { onClose }
                >
                    Cancel
                </UI.Button>

                <UI.Button
                    positive
                    onClick = { onSave }
                    disabled = { !hasImage }
                >
                    Save
                </UI.Button>

            </UI.Modal.Actions>
        </UI.Modal>
    );
});

//================================================================//
// CraftingImagePickerModal
//================================================================//
export const CraftingImagePickerModal = observer (( props ) => {

    const { open, imageURL, setImageURL } = props;
    const [ counter, setCounter ] = useState ( 0 );

    const onClose = () => {
        setCounter ( counter + 1 );
        props.onClose ();
    }

    return (
        <CraftingImagePickerModalBody
            key         = { counter }
            imageURL    = { imageURL }
            setImageURL = { setImageURL }
            open        = { open }
            onClose     = { onClose }
        />
    );
});