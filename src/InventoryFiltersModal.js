// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import FileSaver                        from 'file-saver';
import * as fgc                         from 'fgc'
import _                                from 'lodash';
import { observer }                     from 'mobx-react';
import React, { useState }              from 'react';
import * as UI                          from 'semantic-ui-react';

//================================================================//
// InventoryFiltersModalList
//================================================================//
export const InventoryFiltersModalList = observer (( props ) => {

    const [ filterToDelete, setFilterToDelete ]   = useState ( false );

    const { controller, tags , filters} = props;

    let filterList = [];
    for ( let filter of filters.getFilters() ) {

        console.log ( 'FILTERS', filter.description, filter.icon, filter.color, filter.text );

        filterList.push (
            <div
                key = { filter.text }
                style = {{ marginBottom: '12px' }}
            >
                <UI.Label>
                    <UI.Icon color={filter.color} name={filter.icon} /> {filter.description} - {filter.text}
                </UI.Label>
                <UI.Button
                    floated         = 'right'
                    icon            = 'trash'
                    size            = 'mini'
                    style           = {{ marginTop: '-5px'}}
                    onClick         = {() => { setFilterToDelete ( filter.text )}}
                />
            </div>
        );
    }

    const deleteTag = () => {
        filters.deleteFilter(filterToDelete);
        setFilterToDelete ( false );
    }

    return (
        <React.Fragment>
            { filterList }
            <UI.Modal
                open = { filterToDelete !== false }
                onClose = {() => { setFilterToDelete ( false ); }}
            >
                <UI.Modal.Header>Delete filter</UI.Modal.Header>
                <UI.Modal.Content>
                    { `Are you sure you want to delete filter '${ filterToDelete }'?` }
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
// InventoryFiltersModal
//================================================================//
export const InventoryFiltersModal = observer (( props ) => {

    const [ searchString, setSearchString ]     = useState ( '' );
    const [ icon, setIcon ]     = useState ( '' );
    const [ iconColor, setIconColor ]     = useState ( '' );
    const [ description, setDescription ]     = useState ( '' );
    const [ isOpen, setIsOpen ]         = useState ( false );
    const [ searchQuery, setSearchQuery ]         = useState ( '' );


    const { controller, tags , filters} = props;
    
    const downloadFilters = () => {
        const blob = new Blob ([ JSON.stringify ( filters.getFilters(), null, 4 )], { type: 'text/plain;charset=utf-8' });
        FileSaver.saveAs ( blob, 'inventory-filters.json' );
    }

    const getFilterOptions = () =>{
        let filterOptions = [];
        for ( let filter of filters.getFilters()) {
            filterOptions.push({
                "icon": filter.icon,
                "text": filter.description 
            });
        }
        return filterOptions;
    }

    const uploadFiltersAsync = async ( text ) => {
        try {
            filters.importFilters(JSON.parse ( text ));
        }
        catch ( error ) {
            console.log ( error );
        }
    }

    const addFilter = async ( desc, icon, color, text ) => {
        try {
            if(desc && icon && text) {
                filters.addFilter( {
                    "icon": icon,
                    "color": color ? color : "gray",
                    "text": text,
                    "description": desc
                });
            }
            setIcon('')
            setIconColor('')
            setDescription('');
            setSearchQuery('')
            setIsOpen ( false )
        }
        catch ( error ) {
            console.log ( error );
        }
    }

    const handleChange = (e, { value }) => filters.setFilter(value);
    const handleSearchChange = (e, { searchQuery }) => setSearchQuery(searchQuery)
    
    return (
            <UI.Menu.Item
                onClick = {() => { setIsOpen ( true )}}
            >
            <UI.Icon.Group>
                <UI.Icon name = 'filter'/>
                <UI.Icon corner='bottom right' name='add' />
            </UI.Icon.Group>
                    <UI.Modal
                        style = {{ height : 'auto' }}
                        open = { isOpen }
                        onClose = {() => {
                            setIsOpen ( false );
                            controller.clearSelection ();
                        }}
                    >
                    <UI.Modal.Header>Filters <UI.Label as='a' size="mini" content='Icons list' onClick={()=> window.open("https://react.semantic-ui.com/elements/icon/", "_blank")} icon='question circle outline' />
                    </UI.Modal.Header>
                        <UI.Modal.Content>
                            <UI.Menu inverted attached = 'top'>
                            <UI.Popup content='Upload filters' trigger={<div><fgc.FilePickerMenuItem
                                    hideReloadButton
                                    accept      = 'application/json'
                                    format      = 'text'
                                    icon        = { 'upload' }
                                    loadFile    = { uploadFiltersAsync }
                                /></div>} />
                                
                                <UI.Popup content='Download filters' trigger={<UI.Menu.Item
                                    icon        = { 'download' }
                                    onClick     = { downloadFilters }
                                />}/>
                            </UI.Menu>
                            <UI.Segment attached = 'bottom'>
                                <InventoryFiltersModalList
                                    controller      = { controller }
                                    tags            = { tags }
                                    filters = {filters}
                                />
                                <UI.Divider horizontal>Add filter</UI.Divider>
                                <UI.Input
                                    fluid
                                    maxLength = '20'
                                    placeholder = 'Description'
                                    style = {{ marginTop: '6px' }}
                                    value = { description }
                                    onChange = {( event ) => { setDescription( event.target.value )}}
                                />
                                <UI.Input
                                    fluid
                                    maxLength = '20'
                                    placeholder = 'Icon Name'
                                    style = {{ marginTop: '6px' }}
                                    value = { icon }
                                    onChange = {( event ) => { setIcon ( event.target.value )}}
                                />
                                <UI.Input
                                    fluid
                                    maxLength = '20'
                                    placeholder = 'Icon Color'
                                    style = {{ marginTop: '6px' }}
                                    value = { iconColor }
                                    onChange = {( event ) => { setIconColor ( event.target.value )}}
                                />
                                <UI.Input
                                    fluid
                                    placeholder = 'SQL: SELECT * FROM ? WHERE'
                                    style = {{ marginTop: '6px' }}
                                    value = { searchString }
                                    onChange = {( event ) => { setSearchString ( event.target.value )}}
                                />
                                <UI.Button
                                fluid
                                style = {{ marginTop: '6px' }}
                        icon            = 'add'
                        onClick         = {() => { addFilter(description, icon, iconColor, searchString) }}
                    />
                            </UI.Segment>
                        </UI.Modal.Content>
                    </UI.Modal>
            </UI.Menu.Item>
    );
});
