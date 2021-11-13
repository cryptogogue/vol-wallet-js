// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { StampAssetPreviewModal }               from './StampAssetPreviewModal'
import { StampAssetSelectionModal }             from './StampAssetSelectionModal'
import { STATUS }                               from './StampAssetsFormController'
import * as Fields                              from '../fields/fields'
import { AssetCardView }                        from 'cardmotron';
import { observer }                             from 'mobx-react';
import React, { useState }                      from 'react';
import * as UI                                  from 'semantic-ui-react';
import * as vol                                 from 'vol';

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

                <div style = {{ width: '100%', textAlign: 'center' }}>
                    <div style = {{ display: 'inline-block' }}>
                        <AssetCardView assetID = { controller.stampAsset.assetID } inventory = { controller.stampInventory }/>

                        <UI.Header.Subheader as = 'h3' style = {{ paddingBottom: 10 }}>
                            { `Price per Asset: ${ vol.util.format ( controller.stamp.price )}` }
                        </UI.Header.Subheader>
                    </div>
                </div>

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

                    <Fields.AssetSelectionField assets = { controller.assetSelection }/>

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
