import { assert, hooks, InfiniteScrollView, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                                         from 'mobx-react';
import React, { useState, useRef, useLayoutEffect }         from 'react';
import * as UI                                              from 'semantic-ui-react';
import url                                                  from 'url';

const PORT          = 9090;
const COUNT         = 4;

//================================================================//
// DebugHTTPController
//================================================================//
class DebugHTTPController {

    @observable results = {};
    @observable isBusy = false;

    //----------------------------------------------------------------//
    constructor () {
        this.revocable = new RevocableContext ();
    }

    //----------------------------------------------------------------//
    async fetch ( nodeURL, options ) {
        try {
            const result = await this.revocable.fetchJSON ( nodeURL, options );
            console.log ( 'RESULT:', result );
            return ( result.method === ( options ? options.method : 'GET' ));
        }
        catch ( error ) {
            console.log ( error );
        }
        return false;
    }

    //----------------------------------------------------------------//
    finalize () {
        this.revocable.finalize ();
    }

    //----------------------------------------------------------------//
    @action setBusy ( busy ) {
        this.isBusy = busy;
    }

    //----------------------------------------------------------------//
    @action setResult ( method, result ) {
        this.results [ method ] = Boolean ( result );
    }

    //----------------------------------------------------------------//
    async testURL ( nodeURL ) {

        this.setBusy ( true );

        runInAction (() => {
            this.results = {};
        });

        let result = false;

        nodeURL             = url.parse ( nodeURL );
        nodeURL.pathname    = '/debug/echo';
        nodeURL             = url.format ( nodeURL );

        result = await this.fetch ( nodeURL );
        this.setResult ( 'GET', result );

        result = await this.fetch ( nodeURL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify ({})});
        this.setResult ( 'POST', result );

        result = await this.fetch ( nodeURL, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify ({})});
        this.setResult ( 'PUT', result );

        result = await this.fetch ( nodeURL, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify ({})});
        this.setResult ( 'PATCH', result );

        result = await this.fetch ( nodeURL, { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify ({})});
        this.setResult ( 'DELETE', result );

        this.setBusy ( false );
    }
}

//================================================================//
// DebugHTTPScreen
//================================================================//
export const DebugHTTPScreen = observer (( props ) => {

    const controller                = hooks.useFinalizable (() => new DebugHTTPController ());
    const [ nodeURL, setNodeURL ]   = useState ( '' );

    let onCheck = () => {
        controller.testURL ( nodeURL );
    }

    const isBusy        = controller.isBusy;
    const testEnabled   = Boolean ( nodeURL );

    const list = [];
    for ( let method in controller.results ) {

        const ok = controller.results [ method ];

        const iconName = ok ? 'check' : 'x';

        list.push (
            <UI.Message
                key = { method }
                icon
                positive = { ok }
                negative = { !ok }
            >
                <UI.Icon name = { iconName }/>
                <UI.Message.Header>{ method }</UI.Message.Header>
            </UI.Message>
        );
    }

    return (
        <SingleColumnContainerView title = 'Test HTTP Fetch (VOL Node API)'>
            <UI.Segment>
                <UI.Form>
                    <p><span>Enter the URL of a Volition mining node then press </span><UI.Icon name = 'sync alternate'/><span>to sync:</span></p>
                    <UI.Form.Field>
                        <UI.Input
                            fluid
                            loading = { isBusy }
                            action = {
                                <If condition = { !isBusy }>
                                    <UI.Button
                                        icon = 'sync alternate'
                                        color = { testEnabled ? 'green' : 'grey' }
                                        disabled = { !testEnabled }
                                        onClick = { onCheck }
                                    />
                                </If>
                            }
                            placeholder     = "Volition Node URL"
                            name            = "nodeURL"
                            type            = "url"
                            value           = { nodeURL }
                            onChange        = {( event ) => { setNodeURL ( event.target.value )}}
                        />
                    </UI.Form.Field>
                </UI.Form>

                <UI.List>
                    { list }
                </UI.List>

            </UI.Segment>
        </SingleColumnContainerView>
    );
});
