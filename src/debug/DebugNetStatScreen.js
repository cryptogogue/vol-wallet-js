import { assert, hooks, InfiniteScrollView, RevocableContext, util } from 'fgc';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                                         from 'mobx-react';
import React, { useState, useRef, useLayoutEffect }         from 'react';
import AutoSizer                                            from 'react-virtualized-auto-sizer';
import { Dropdown, Grid, Icon, List, Menu, Card, Group }    from 'semantic-ui-react';

const PORT          = 9090;
const COUNT         = 4;
const NODE_URL      = 'http://127.0.0.1:9090';
// const NODE_URL      = 'https://vol9090.fgcdev.com';

//================================================================//
// NetStatService
//================================================================//
export class NetStatService {

     @observable height         = 0;
     @observable offset         = 0;
     @observable urls           = [ NODE_URL ];

    //----------------------------------------------------------------//
    constructor () {

        this.revocable = new RevocableContext ();
        this.serviceLoop ();
    }

    //----------------------------------------------------------------//
    finalize () {

        this.revocable.finalize ();
    }

    //----------------------------------------------------------------//
    async scanNetwork () {

        const promises = [];
        const nextHeight = this.height + this.offset;

        const fetchChain = async ( url ) => {
            try {
                return await this.revocable.fetchJSON ( `${ url }/consensus/peek/${ nextHeight }?sampleMiners=16` );
            }
            catch ( error ) {
            }
            return false;
        }

        // fetch all the chains
        for ( let url of this.urls ) {
            promises.push ( fetchChain ( url ));
        }

        const results = await this.revocable.all ( promises );

        let maxCount        = 0;
        const histogram     = {};

        runInAction (() => {

            for ( let result of results ) {

                const header = result && result.header;

                if ( header && ( header.height === nextHeight )) {

                    const digest = header.digest;
                    const count = ( histogram [ digest ] || 0 ) + 1;
                    histogram [ digest ] = count;
                    maxCount = maxCount < count ? count : maxCount;
                }

                if ( result.miners ) {
                    for ( let minerURL of result.miners ) {
                        if ( !this.urls.includes ( minerURL )) {
                            this.urls.push ( minerURL );
                        }
                    }
                }
            }
        
            if ( maxCount === this.urls.length ) {
                this.height = nextHeight;
                this.offset = this.offset ? this.offset * 2 : 1;
            }
            else {
                this.offset = this.offset > 1 ? this.offset / 2 : 1;
            }
        });

        console.log ( this.urls.length, this.height, this.offset );
    }

    //----------------------------------------------------------------//
    async serviceLoop () {

        let timeout = 1000;
        await this.scanNetwork ();
        this.revocable.timeout (() => { this.serviceLoop ()}, timeout );
    }
}

//================================================================//
// DebugNetStatScreen
//================================================================//
export const DebugNetStatScreen = observer (( props ) => {

    const netStatService    = hooks.useFinalizable (() => new NetStatService ());
    const canvasRef         = useRef ();

    return (
        <div style = {{
            display: 'flex',
            flexFlow: 'column',
            height: '100vh',
        }}>
        </div>
    );
});
