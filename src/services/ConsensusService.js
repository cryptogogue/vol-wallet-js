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
const debugLog = function ( ...args ) { console.log ( '@CONSENSUS:', ...args ); }

//================================================================//
// ConsensusService
//================================================================//
export class ConsensusService {

    @observable error;

    @observable genesis;
    @observable identity;
    @observable height;

    @observable digest;
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

        miner.minerID           = minerID;
        miner.digest            = false;        // digest at current consensus height (prev)
        miner.nextDigest        = false;        // digest at next consensus height (peek)
        miner.url               = nodeURL;
        miner.isBusy            = false;
        miner.online            = true;

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
            if ( miner.digest === this.digest ) {
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

        this.digest             = false;
        this.step               = 0;
        this.skip               = false;
        this.isCurrent          = false;

        this.minersByID         = {};
        this.ignoreURLs         = {};
        this.activeURLs         = {};

        this.pendingURLs        = {};
    }

    //----------------------------------------------------------------//
    async serviceLoop () {

        assert ( false );

        await this.discoverMinersAsync ();
        await this.updateMinersAsync ();

        let timeout = 5000;
        if ( this.onlineMiners.length ) {
            await this.updateConsensus ();
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
    setMinerStatus ( minerID, url, prev, peek ) {

        const miner             = this.minersByID [ minerID ];

        miner.minerID           = minerID;
        miner.digest            = prev ? prev.digest : false;
        miner.nextDigest        = peek ? peek.digest : false;
        miner.url               = url;
        miner.isBusy            = false;
        miner.online            = true;
    }

    //----------------------------------------------------------------//
    @action
    updateConsensus () {

        // see if we need a rollback (all online miners have wrong 'current' digest
        let rollbackCount = 0;
        for ( let miner of this.onlineMiners ) {
            if ( miner.digest !== this.digest ) {
                rollbackCount++;
            }
        }

        if ( rollbackCount == this.onlineMiners.length ) {

            debugLog ( 'CONTROL: ************** ROLLBACK **************' );

            // every single node has backslid; start over.
            this.height         = 0;
            this.digest         = this.genesis;
            this.step           = 0;
            this.isCurrent      = false;

            return;
        }

        const minerCount = this.currentMiners.length;
        if ( !minerCount ) return; // no online miners

        const nextHeight = this.height + this.step;

        // build a histogram of digest at next height; also get the rollback count
        const histogram = {}; // counts by digest
        for ( let miner of this.currentMiners ) {

            if ( miner.nextDigest ) {
                const count = histogram [ miner.nextDigest ] || 0;
                histogram [ miner.nextDigest ] = count + 1;
            }
        }

        let bestCount = 0;
        let bestDigest = false;

        for ( let digest in histogram ) {
            const count = histogram [ digest ];
            if ( bestCount < count ) {
                bestCount       = count;
                bestDigest      = digest;
            }
        }

        const bestConsensus = bestCount / minerCount;

        const accept = () => {

            this.isCurrent = false;

            const minersByID = _.cloneDeep ( this.minersByID );

            for ( let minerID in minersByID ) {
                const miner = minersByID [ minerID ];
                if ( miner.nextDigest === bestDigest ) {
                    miner.digest = bestDigest;
                }
            }

            this.minersByID = minersByID;

            this.height     = nextHeight;
            this.digest     = bestDigest;
        }

        if ( this.skip ) {

            if ( this.skip === bestConsensus ) {
                accept ();
                debugLog ( `CONTROL: SKIPPED: ${ this.height } --> ${ nextHeight }` );
            }

            this.isCurrent = false;
            this.step = 1;
            this.skip = false;
        }
        else {

            this.skip = false;

            if ( bestConsensus === 1.0 ) {

                accept ();
                this.step = this.step > 0 ? this.step * 2 : 1;

                debugLog ( 'CONTROL: SPEED UP:', this.step );
            }
            else if (( this.step === 1 ) && ( bestConsensus > 0.5 )) {

                this.isCurrent = false;

                this.isCurrent      = false;
                this.checkCurrent   = false;

                this.step = 10;
                this.skip = bestConsensus;

                debugLog ( 'CONTROL: SKIP:', this.step );
            }
            else {

                this.isCurrent = ( this.step === 1 );

                this.step = this.step > 1 ? this.step / 2 : 1;

                debugLog ( 'CONTROL: SLOW DOWN:', this.step );
            }
        }   
    }

    //----------------------------------------------------------------//
    @action
    async updateMinersAsync () {

        debugLog ( 'SYNC: MINERS: SCAN MINERS' );

        const nextHeight = this.height + this.step;

        if ( _.size ( this.minersByID ) === 0 ) {
            debugLog ( 'SYNC: No miners found.' );
            return 5000;
        }

        const peek = async ( miner ) => {

            runInAction (() => {
                miner.isBusy = true;
            })

            try {

                // "peek" at the headers of the current and next block; also get a random sample of up to 16 miners.
                let peekURL         = url.parse ( miner.url );
                peekURL.pathname    = `/consensus/peek`;
                peekURL.query       = { peek: nextHeight, prev: this.height, sampleMiners : 16 };
                peekURL             = url.format ( peekURL );

                debugLog ( 'SYNC: PEEK:', peekURL );

                const result = await this.revocable.fetchJSON ( url.format ( peekURL ));
                
                debugLog ( 'SYNC: PEEK RESULT:', result );

                if ( result.genesis === this.genesis ) {
                    result.miners.push ( miner.url );
                    this.extendNetwork ( result.miners );
                    this.setMinerStatus ( result.minerID, miner.url, result.prev, result.peek );
                }
                else {
                    this.setMinerOffline ( miner.minerID );
                }
            }
            catch ( error ) {
                debugLog ( 'SYNC: MINERS:', error );
                this.setMinerOffline ( miner.minerID );
            }
        }

        const promises = [];
        for ( let minerID in this.minersByID ) {
            const miner = this.minersByID [ minerID ];
            if ( miner.isBusy ) continue;

            promises.push ( peek ( miner ));
        }

        await this.revocable.all ( promises );

        debugLog ( 'SYNC: UPDATED MINERS:', JSON.stringify ( this.minersByID, null, 4 ));
    }
}
