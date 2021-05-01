// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AccountStateService }          from './AccountStateService';
import { AppStateService }              from './AppStateService';
import { InventoryController }          from 'cardmotron';
import { assert, crypto, excel, ProgressController, randomBytes, RevocableContext, SingleColumnContainerView, StorageContext, util } from 'fgc';
import * as bcrypt                      from 'bcryptjs';
import _                                from 'lodash';
import { action, computed, extendObservable, observable, observe, reaction, runInAction } from 'mobx';
import React                            from 'react';
import url                              from 'url';
import { vol }                          from 'vol';

//const debugLog = function () {}
const debugLog = function ( ...args ) { console.log ( '@CONSENSUS SERVICE:', ...args ); }

//================================================================//
// ConsensusService
//================================================================//
export class ConsensusService {

    @observable error;

    @observable genesis;
    @observable identity;
    @observable height;

    @observable currentDigest;
    @observable step;
    @observable isCurrent;

    @observable minersByID;
    @observable ignoreURLs;
    @observable activeURLs;

    @observable pendingURLs; // 'true' if scanned; 'false' if not

    //----------------------------------------------------------------//
    @action
    affirmMiner ( minerID, nodeURL ) {

        const miner = this.minersByID [ minerID ] || {};

        if ( miner.url ) {
            miner.url = nodeURL;
            return;
        }

        debugLog ( 'AFFIRMING MINER', minerID, nodeURL );

        miner.minerID   = minerID;
        miner.height    = -1;
        miner.prev      = false;
        miner.peek      = false;
        miner.url       = nodeURL;
        miner.isBusy    = false;
        miner.online    = true;

        this.minersByID [ minerID ] = miner;
    }

    //----------------------------------------------------------------//
    constructor () {

        this.revocable = new RevocableContext ();
        this.reset ();
    }

    //----------------------------------------------------------------//
    @computed get
    currentMiners () {

        const miners = [];

        for ( let miner of this.onlineMiners ) {
            if (( miner.prev !== false ) && ( miner.height === this.height )) {
                miners.push ( miner );
            }
        }
        return miners;
    }

    //----------------------------------------------------------------//
    @action
    async discoverMinersAsync () {

        const checkMiner = async ( nodeURL, isPrimary ) => {

            debugLog ( 'CHECKING:', nodeURL );

            try {

                const confirmURL            = url.parse ( nodeURL );
                confirmURL.pathname         = `/`;

                let result = await this.revocable.fetchJSON ( url.format ( confirmURL ));

                if ( result.minerID && result.isMiner ) {
                    debugLog ( 'FOUND A MINER:', nodeURL );
                    if ( result.genesis === this.genesis ) {
                        this.affirmMiner ( result.minerID, nodeURL );
                    }
                
                    confirmURL.pathname = `/miners`;
                    result = await this.revocable.fetchJSON ( url.format ( confirmURL ));

                    if ( result.miners ) {
                        for ( let minerURL of result.miners ) {
                            this.extendNetwork ( minerURL );
                        }
                    }
                }
            }
            catch ( error ) {
                debugLog ( error );
            }
        }

        const promises = [];
        for ( let nodeURL in this.pendingURLs ) {
            if ( this.pendingURLs [ nodeURL ]) continue;
            this.pendingURLs [ nodeURL ] = true;
            promises.push ( checkMiner ( nodeURL, nodeURL = this.nodeURL ));
        }
        await this.revocable.all ( promises );
    }

    //----------------------------------------------------------------//
    @action
    extendNetwork ( nodeURLs ) {

        nodeURLs = ( typeof ( nodeURLs ) === 'string' ) ? [ nodeURLs ] : nodeURLs;

        debugLog ( 'EXTEND NETWORK:', nodeURLs );

        for ( let nodeURL of nodeURLs ) {

            nodeURL             = url.parse ( nodeURL );
            nodeURL.pathname    = `/`;
            nodeURL             = url.format ( nodeURL );

            if ( !_.has ( this.pendingURLs, nodeURL )) {
                this.pendingURLs [ nodeURL ] = false;
            }
        }
    }

    //----------------------------------------------------------------//
    finalize () {

        this.revocable.finalize ();
    }

    //----------------------------------------------------------------//
    formatServiceURL ( base, path, query, mostCurrent ) {

        const serviceURL        = url.parse ( base );
        serviceURL.pathname     = path;
        serviceURL.query        = _.cloneDeep ( query || {} );

        if ( mostCurrent !== true ) {
            serviceURL.query.at = this.height;
        }

        return url.format ( serviceURL );
    }

    //----------------------------------------------------------------//
    getServiceURL ( path, query, mostCurrent ) {

        const onlineURLs = this.onlineURLs;
        const serviceURL = onlineURLs.length ? onlineURLs [ Math.floor ( Math.random () * onlineURLs.length )] : false;
        return this.formatServiceURL ( serviceURL, path, query, mostCurrent );
    }

    //----------------------------------------------------------------//
    getServiceURLs ( path, query, mostCurrent ) {

        const urls = [];

        for ( let minerID of this.onlineMiners ) {
            urls.push ( this.formatServiceURL ( miner.url, path, query, mostCurrent ));
        }
        return urls;
    }

    //----------------------------------------------------------------//
    @action
    initialize ( identity, genesis, height, digest, nodeURLs ) {

        this.identity   = identity;
        this.genesis    = genesis;
        this.height     = height;
        this.digest     = digest;

        this.extendNetwork ( nodeURLs );
    }

    //----------------------------------------------------------------//
    async initializeWithNodeURLAsync ( nodeURL ) {

        this.reset ();

        try {

            const info = await this.revocable.fetchJSON ( nodeURL );

            if ( info && ( info.type === 'VOL_MINING_NODE' )) {

                if ( info.isMiner && info.minerID ) {

                    let accountInfo = await this.revocable.fetchJSON ( `${ nodeURL }accounts/${ info.minerID }` );
                    if ( accountInfo && accountInfo.miner ) {
                        nodeURL = accountInfo.miner.url;
                    }
                }
                this.initialize ( info.identity, info.genesis, 0, info.genesis, nodeURL );
                await this.discoverMinersAsync ();

                if ( !this.onlineMiners.length ) return 'Problem getting miners.';
            }
            else {
                return 'Not a mining node.';
            }
        }
        catch ( error ) {
            console.log ( error );
            runInAction (() => {
                return 'Problem reaching URL; may be offline.';
            });
        }
    }

    //----------------------------------------------------------------//
    @computed get
    isOnline () {

        const totalMiners = _.size ( this.minersByID );
        return totalMiners ? ( this.onlineMiners.length > Math.floor ( totalMiners / 2 )) : false;
    }

    //----------------------------------------------------------------//
    @computed get
    onlineMiners () {

        const miners = [];

        for ( let minerID in this.minersByID ) {
            const miner = this.minersByID [ minerID ];
            if ( miner.online ) {
                miners.push ( miner );
            }
        }
        return miners;
    }

    //----------------------------------------------------------------//
    @computed get
    onlineURLs () {

        const onlineURLs = [];

        for ( let miner of this.onlineMiners ) {
            onlineURLs.push ( miner.url );
        }
        return onlineURLs;
    }


    //----------------------------------------------------------------//
    @action
    reset () {

        this.error              = false;

        this.genesis            = false;
        this.identity           = '';
        this.height             = 0;

        this.currentDigest      = false;
        this.step               = 0;
        this.isCurrent          = false;

        this.minersByID         = {};
        this.ignoreURLs         = {};
        this.activeURLs         = {};

        this.pendingURLs        = {};
    }

    //----------------------------------------------------------------//
    async serviceLoop () {

        await this.discoverMinersAsync ();
        await this.updateMinersAsync ();

        let timeout = 5000;
        if ( this.onlineMiners.length ) {
            await this.updateConsensusAsync ();
            timeout = this.isCurrent ? 15000 : 1;
        }
        debugLog ( 'Next update in...', timeout );
        this.revocable.timeout (() => { this.serviceLoop ()}, timeout );
    }

    //----------------------------------------------------------------//
    @action
    setMinerOffline ( minerID ) {

        const miner         = this.minersByID [ minerID ];

        debugLog ( 'UPDATE MINER OFFLINE', minerID, );

        miner.isBusy        = false;
        miner.online        = false;
    }

    //----------------------------------------------------------------//
    @action
    setMinerStatus ( minerID, height, url, prev, peek ) {

        const miner         = this.minersByID [ minerID ];

        debugLog ( 'UPDATE MINER', minerID, height, this.height, url, prev, peek );

        miner.minerID       = minerID;
        miner.height        = height;
        miner.prev          = prev ? prev.digest : false;
        miner.peek          = peek ? peek.digest : false;
        miner.url           = url;
        miner.isBusy        = false;
        miner.online        = true;
    }

    //----------------------------------------------------------------//
    @action
    updateConsensusAsync () {

        debugLog ( 'UPDATE' );

        const nextHeight = this.height + this.step;

        let minerCount      = 0;
        let currentCount    = 0;
        let matchCount      = 0;
        let missingCount    = 0;

        let nextDigest      = false;

        const currentMiners = [];

        for ( let minerID in this.minersByID ) {

            assert ( minerID );

            const miner = this.minersByID [ minerID ];
            debugLog ( 'MINER', miner.height, minerID, miner.prev, miner.peek );

            // completely ignore offline miners and miners not at current height
            if ( !miner.online ) continue;
            if ( miner.height !== this.height ) continue;

            // running count of miners we care about
            minerCount++;

            // exclude nodes missing 'prev'
            if ( miner.prev === false ) {
                debugLog ( 'MISSING', minerID, miner.height );
                missingCount++;
                continue;
            }

            currentCount++;
            currentMiners.push ( miner );

            // 'header' may be missing if 'nextHeight' hasn't yet been mined.
            if ( miner.peek ) {

                nextDigest = nextDigest || miner.peek;

                if ( miner.peek === nextDigest ) {
                    matchCount++;
                }
            }
        }

        debugLog ( 'CURRENT COUNT:', currentCount, 'MATCH COUNT:', matchCount );

        // no miners for current step
        if ( minerCount === 0 ) return;

        if ( currentCount > 0 ) {

            if ( matchCount === currentCount ) {

                debugLog ( 'SPEED UP' );

                if ( this.step > 2 ) {
                    this.isCurrent = false;
                }

                this.height     = nextHeight;
                this.digest     = nextDigest;

                this.step = this.step ? this.step * 2 : 1;

                for ( let miner of currentMiners ) {
                    miner.height = this.height;
                }
            }
            else {

                debugLog ( 'SLOW DOWN' );

                // the check failed and is only one step ahead, thus the current height must be current.
                if ( this.step === 1 ) {
                    this.isCurrent = true;
                }
                this.step = this.step > 1 ? this.step / 2 : 1;
            }
        }
        else if ( missingCount === minerCount ) {

            debugLog ( 'RESET', missingCount, minerCount, JSON.stringify ( this.minersByID, null, 4 ));

            // every single node has backslid; start over.
            this.height         = 0;
            this.digest         = this.genesis;
            this.step           = 0;
            this.isCurrent      = false;
        }

        debugLog ( 'STEP', {
            currentCount:   currentCount,
            matchCount:     matchCount,
            height:         this.height,
            step:           this.step,
            digest:         this.digest,
        });

        debugLog ( 'MINERS', JSON.stringify ( this.minersByID, null, 4 ));
    }

    //----------------------------------------------------------------//
    @action
    async updateMinersAsync () {

        debugLog ( 'SCAN MINERS' );
        debugLog ( 'SCANNED', JSON.stringify ( this.ignoreURLs ));

        const nextHeight = this.height + this.step;

        if ( _.size ( this.minersByID ) === 0 ) {
            debugLog ( 'No miners found.' );
            return 5000;
        }

        const peek = async ( miner ) => {

            debugLog ( 'PEEK:', miner.url, this.height, nextHeight );

            runInAction (() => {
                miner.isBusy = true;
            })

            try {

                // "peek" at the headers of the current and next block; also get a random sample of up to 16 miners.
                const peekURL       = url.parse ( miner.url );
                peekURL.pathname    = `/consensus/peek`;
                peekURL.query       = { peek: nextHeight, prev: this.height, sampleMiners : 16 };

                const height        = this.height;

                const result = await this.revocable.fetchJSON ( url.format ( peekURL ));
                
                debugLog ( 'PEEK RESULT:', miner.url, result );

                if ( result.genesis === this.genesis ) {
                    result.miners.push ( miner.url );
                    this.extendNetwork ( result.miners );
                    this.setMinerStatus ( result.minerID, height, miner.url, result.prev, result.peek );
                }
                else {
                    this.setMinerOffline ( miner.minerID );
                }
            }
            catch ( error ) {
                debugLog ( error );
                this.setMinerOffline ( miner.minerID );
            }
        }

        const promises = [];
        for ( let minerID in this.minersByID ) {
            const miner = this.minersByID [ minerID ];
            if ( miner.isBusy ) continue;

            const promise = peek ( miner );

            if (( miner.height <= 0 ) || ( miner.prev )) {
                promises.push ( promise );
            }
        }

        await this.revocable.all ( promises );
    }
}
