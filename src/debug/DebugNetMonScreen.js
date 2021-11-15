import { assert, hooks, InfiniteScrollView, RevocableContext, util } from 'fgc';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                                         from 'mobx-react';
import React, { useState, useRef, useLayoutEffect }         from 'react';
import AutoSizer                                            from 'react-virtualized-auto-sizer';
import { Dropdown, Grid, Icon, List, Menu, Card, Group }    from 'semantic-ui-react';

const PORT          = 9090;
const COUNT         = 4;

//================================================================//
// NetMonService
//================================================================//
export class NetMonService {

     @observable chains         = [];
     @observable dims           = false;
     @observable maxHeight      = 0;
     @observable update         = 0;

     @observable height         = 0;

    //----------------------------------------------------------------//
    constructor () {

        this.revocable = new RevocableContext ();
        this.serviceLoop ();
    }

    //----------------------------------------------------------------//
    getCard ( i ) {
        return CARDS [ this.cardArray [ i ]];
    }

    //----------------------------------------------------------------//
    getSizerName ( i ) {
        return this.cardArray [ i ];
    }

    //----------------------------------------------------------------//
    render ( canvas ) {
        
        if ( !( canvas && this.dims )) return;

        canvas.width    = this.dims.width;
        canvas.height   = this.dims.height;

        const ctx = canvas.getContext ( '2d' );

        const CELL_WIDTH    = 32;
        const CELL_HEIGHT   = 8;

        for ( let col = 0; col < this.chains.length; ++col ) {

            const chain = this.chains [ col ];
            if ( !chain ) continue;

            for ( let row = 0; row < chain.length; ++row ) {

                const header = chain [ row ];
                const prefix = header.height > 0 ? header.digest.substring ( 0, 6 ) : '000000';
                ctx.fillStyle = `#${ prefix }`;

                const x = col * CELL_WIDTH;
                const y = ( this.maxHeight - row - 1 ) * CELL_HEIGHT;

                ctx.fillRect ( x, y, CELL_WIDTH, CELL_HEIGHT );
            }
        }
    }

    //----------------------------------------------------------------//
    @action
    resize ( width, height ) {

        this.dims = { width: width, height: height };
    }

    //----------------------------------------------------------------//
    async scanNetwork () {

        const promises = [];

        const fetchChain = async ( port ) => {
            try {
                return await this.revocable.fetchJSON ( `https://vol${ port }.fgcdev.com/consensus/headers?height=${ this.height }` );
            }
            catch ( error ) {
            }
            return false;
        }

        // fetch all the chains
        for ( let i = 0; i < COUNT; ++i ) {
            promises.push ( fetchChain ( PORT + i ));
        }

        const results = await this.revocable.all ( promises );

        runInAction (() => {
            for ( let i = 0; i < COUNT; ++i ) {

                const result    = results [ i ];
                const chain     = result && result.headers;

                if ( chain ) {
                    this.chains [ i ] = chain;
                    this.maxHeight = this.maxHeight < chain.length ? chain.length : this.maxHeight;
                }
                else {
                    this.chains [ i ] = false;
                }
            }
        });
    }

    //----------------------------------------------------------------//
    async serviceLoop () {

        let timeout = 1000;
        await this.scanNetwork ();
        this.revocable.timeout (() => { this.serviceLoop ()}, timeout );
    }
}

//================================================================//
// DebugNetMonScreen
//================================================================//
export const DebugNetMonScreen = observer (( props ) => {

    const netMonService     = hooks.useFinalizable (() => new NetMonService ());
    const canvasRef         = useRef ();

    netMonService.render ( canvasRef.current );

    const onResize = ({ width, height }) => {
        netMonService.resize ( width, height );
    }

    return (
        <div style = {{
            display: 'flex',
            flexFlow: 'column',
            height: '100vh',
        }}>
            <AutoSizer onResize = { onResize }>
                {({ width, height }) => (
                    <canvas style = {{ width: width, height: height }} ref = { canvasRef }/>
                )}
            </AutoSizer>
        </div>
    );
});
