// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { StampAssetPreviewModal }               from './StampAssetPreviewModal'
import { StampAssetSelectionModal }             from './StampAssetSelectionModal'
import { STATUS }                               from './StampAssetsFormController'
import * as Fields                              from '../fields/fields'
import { AssetCardView }                        from 'cardmotron';
import { assert, excel, hooks, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import { DateTime }                             from 'luxon';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                             from 'mobx-react';
import React, { useState }                      from 'react';
import { DateInput, TimeInput }                 from 'semantic-ui-calendar-react';
import * as UI                                  from 'semantic-ui-react';

//================================================================//
// StampAssetSelectionField
//================================================================//
export const StampAssetSelectionField = observer (( props ) => {

    const { assets } = props;

    const list = [];
    for ( let assetID in assets ) {

        const asset     = assets [ assetID ];
        const name      = asset.fields.name ? asset.fields.name.value : assetID;

        list.push (
            <UI.Table.Row key = { assetID }>
                <UI.Table.Cell collapsing>
                    { assetID }
                </UI.Table.Cell>

                <UI.Table.Cell>
                    { name }
                </UI.Table.Cell>
            </UI.Table.Row>
        );
    }

    return (
        <UI.Table celled unstackable>

            <UI.Table.Header>
                <UI.Table.Row>
                    <UI.Table.HeaderCell>Asset ID</UI.Table.HeaderCell>
                    <UI.Table.HeaderCell>Name</UI.Table.HeaderCell>
                </UI.Table.Row>
            </UI.Table.Header>

            <UI.Table.Body>
                { list }
            </UI.Table.Body>
        </UI.Table>
    );
});

//================================================================//
// StampAssetsForm
//================================================================//
export const StampAssetsForm = observer (({ controller }) => {

    const [ stampID, setStampID ]                           = useState ( '' );
    const [ selectionModalOpen, setSelectionModalOpen ]     = useState ( false );
    const [ previewModalOpen, setPreviewModalOpen ]         = useState ( false );

    const inventory = controller.accountService.inventory;

    const onStampIDBlur = () => {
        if ( stampID ) {
            controller.fetchStampAsync ( stampID );
        }
    }

    const onStampIDKeyPress = ( event ) => {
        if ( event.key === 'Enter' ) {
            event.target.blur ();
        }
    }

    const onClickSelectAssets = () => {
        controller.clearSelection ();
        setSelectionModalOpen ( true );
    }

    const isLoading = controller.status === STATUS.BUSY;

    return (
        <React.Fragment>

            <UI.Form.Input
                fluid
                placeholder     = 'Stamp ID'
                type            = 'string'
                name            = 'stampID'
                value           = { stampID }
                onChange        = {( event ) => { setStampID ( event.target.value )}}
                onKeyPress      = { onStampIDKeyPress }
                onBlur          = { onStampIDBlur }
                disabled        = { isLoading }
            />

            <If condition = { controller.stampInventory }>

                <AssetCardView assetID = { controller.stampAsset.assetID } inventory = { controller.stampInventory }/>

                <Choose>
                    <When condition = { controller.filteredInventory }>

                        <StampAssetSelectionModal
                            controller      = { controller }
                            open            = { selectionModalOpen }
                            setOpen         = { setSelectionModalOpen }
                        />

                        <UI.Form.Input>
                            <UI.Button
                                fluid
                                color       = 'teal'
                                onClick     = {() => { setSelectionModalOpen ( true )}}
                            >
                                Select Assets
                            </UI.Button>
                        </UI.Form.Input>
                    </When>

                    <Otherwise>
                    </Otherwise>
                </Choose>
                
                <If condition = { controller.selectedAssetIDs.length > 0 }>

                    <StampAssetSelectionField assets = { controller.assetSelection }/>

                    <StampAssetPreviewModal
                        controller      = { controller }
                        open            = { previewModalOpen }
                        setOpen         = { setPreviewModalOpen }
                    />

                    <UI.Form.Input>
                        <UI.Button
                            fluid
                            color       = 'teal'
                            onClick     = {() => { setPreviewModalOpen ( true )}}
                        >
                            Preview Assets
                        </UI.Button>
                    </UI.Form.Input>
                </If>
            </If>

        </React.Fragment>
    );
});
