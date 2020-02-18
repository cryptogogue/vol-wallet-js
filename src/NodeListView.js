// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { NODE_TYPE, NODE_STATUS }   from './AppStateService';
import React, { useState }          from 'react';
import { observer }                 from 'mobx-react';
import { Button, Form, Input, Label, List, Icon, Segment }    from 'semantic-ui-react';
//import validator                    from 'validator';

//================================================================//
// NodeListView
//================================================================//
export const NodeListView = observer (( props ) => {

    const [ nodeURL, setNodeURL ] = useState ( '' );
    const [ nodeUrlError, setNodeUrlError ] = useState ( '' );

    const { appState } = props;    
    const nodes = appState.nodes;

    //const isEnabled = validator.isURL ( this.state.nodeURL, { protocols: [ 'http','https' ], require_protocol: true });
    const isSubmitEnabled = nodeURL.length > 0;
    const isClearEnabled = nodes.length > 0;

    // TODO: this interface is crap, but it gets us started. what we want is a table of nodes, a status indicator
    // for each node and individual delete buttons for each node.

    const onClickAdd = () => {

        if ( nodeURL.endsWith ( '/' )) {
            appState.affirmNodeURL ( nodeURL.toLowerCase().slice( 0, -1 ));
        }
        else if ( !nodeURL.startsWith ( 'http' )) {
            setNodeUrlError ( 'URL must start with http or https' );
        }
        else {
            appState.affirmNodeURL ( nodeURL.toLowerCase() );
        }
        setNodeURL ( '' );
    };

    const onClickClear = ( url ) => { appState.deleteNode ( url )};
    let onChange = ( event ) => {
        setNodeURL ( event.target.value )
        setNodeUrlError ( '' );
    };

    let urlList = [];
    for ( let url in nodes ) {

        const nodeInfo = appState.getNodeInfo ( url );
        let textColor;
        switch ( nodeInfo.status ) {
            case 'ONLINE':
                textColor = 'green';
                break;
            case 'OFFLINE':
                textColor = 'red';
                break;
            case 'UNKNOWN':
                textColor = 'gray';
                break;
            default:
                textColor = 'pink';
        }
        urlList.push (
            <List.Item key = { urlList.length }>
                <List.Content floated = 'right'>
                    <Icon fitted name = 'trash alternate' onClick = {() => onClickClear ( url )}/>
                </List.Content>
                <List.Content style = {{ textAlign: 'left' }}>
                    <List.Header style = {{ color: textColor }}>{ nodeInfo.type }</List.Header>
                    <List.Description>{ url }</List.Description>
                </List.Content>
            </List.Item>
        )
    }

    return (

        <Segment>
            <List divided relaxed verticalAlign = 'middle' style = {{ padding: '0 3px', width: '100%' }}>
                { urlList }
            </List>
            <Form size = "large">
                <Segment stacked>
                    <Form.Field>
                        <Input
                            fluid
                            placeholder = "Node URL"
                            name = "nodeURL"
                            type = "url"
                            value = { nodeURL }
                            onChange = { onChange }
                        />
                        { nodeUrlError && <Label pointing prompt>{ nodeUrlError }</Label> }
                    </Form.Field>
                    <Button color = "teal" fluid disabled = { !isSubmitEnabled } onClick = { onClickAdd }>
                        Add
                    </Button>
                    { isClearEnabled && <Button color = "red" fluid onClick = { onClickClear }>Clear</Button> }
                </Segment>
            </Form>
        </Segment>
    );
});
