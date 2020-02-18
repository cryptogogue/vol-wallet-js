// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import pkg from '../package.json'

import './index.css';
import 'semantic-ui-css/semantic.min.css';

import * as cardmotron from 'cardmotron';
import * as fgc from 'fgc';

import { configure } from 'mobx';
configure ({
    enforceActions:     'always',
});

import { AccountScreen }                from './AccountScreen';
import { CraftingScreen }               from './CraftingScreen';
import { DashboardScreen }              from './DashboardScreen';
import { InventoryScreen }              from './InventoryScreen';
import { KeysScreen }                   from './KeysScreen';
import { NetworkScreen }                from './NetworkScreen';
import { SchemaUtilScreen }             from './SchemaUtilScreen';
import { UpgradesScreen }               from './UpgradesScreen';
import registerServiceWorker            from './util/registerServiceWorker';
import React                            from 'react';
import { useClearCache }                from "react-clear-cache";
import ReactDOM                         from 'react-dom';
import { BrowserRouter, Route, Link, Switch, useLocation } from "react-router-dom";

//----------------------------------------------------------------//
const App = () => {

    const { isLatestVersion, emptyCacheStorage } = useClearCache ();
    const location = useLocation ();

    if ( !isLatestVersion ) {
        emptyCacheStorage ();
    }

    return (
        <div>
            <Switch key = { location.pathname }>
                <Route exact path = "/net/:networkID/account/:accountID"                component = { AccountScreen }/>
                <Route exact path = "/net/:networkID/account/:accountID/crafting/:methodName" component = { CraftingScreen }/>
                <Route exact path = "/net/:networkID/account/:accountID/crafting"       component = { CraftingScreen }/>
                <Route exact path = "/net/:networkID/account/:accountID/inventory"      component = { InventoryScreen }/>
                <Route exact path = "/net/:networkID/account/:accountID/keys"           component = { KeysScreen }/>
                <Route exact path = "/net/:networkID/account/:accountID/upgrades"       component = { UpgradesScreen }/>
                <Route exact path = "/net/:networkID"                                   component = { NetworkScreen }/>
                
                <Route exact path = "/util/schema"              component = { SchemaUtilScreen }/>

                <Route exact path = "/debug/aes"                component = { fgc.debug.AESScreen }/>
                <Route exact path = "/debug/barcode/pdf417"     component = { fgc.debug.BarcodePDF417Screen }/>
                <Route exact path = "/debug/barcode/qr"         component = { fgc.debug.BarcodeQRScreen }/>
                <Route exact path = "/debug/cardmotron"         component = { cardmotron.EditorScreen }/>
                <Route exact path = "/debug/cryptokey"          component = { fgc.debug.CryptoKeyScreen }/>
                <Route exact path = "/debug/dropzone"           component = { fgc.debug.DropzoneScreen }/>
                <Route exact path = "/debug/filepicker"         component = { fgc.debug.FilePickerScreen }/>
                <Route exact path = "/debug/handlebars"         component = { fgc.debug.HandlebarsScreen }/>
                <Route exact path = "/debug/infinitescroll"     component = { fgc.debug.InfiniteScrollScreen }/>
                <Route exact path = "/debug/mobx"               component = { fgc.debug.MobXScreen }/>
                <Route exact path = "/debug/print"              component = { fgc.debug.PrintScreen }/>
                <Route exact path = "/debug/squap"              component = { cardmotron.debug.SquapScreen }/>
                <Route exact path = "/debug/textfitter"         component = { fgc.debug.TextFitterScreen }/>
                <Route exact path = "/debug/textstyle"          component = { fgc.debug.TextStyleScreen }/>

                <Route exact path = "/util/schema"              component = { cardmotron.SchemaScreen }/>

                <Route exact path = "/"                         component = { DashboardScreen }/>
            </Switch>
            <div style = {{
                width: '100%',
                textAlign: 'center',
            }}>
                { `${ pkg.name } ${ pkg.version }` }
            </div>
        </div>
    );
}

//----------------------------------------------------------------//
ReactDOM.render (
    <BrowserRouter>
        <App/>
    </BrowserRouter>,
    document.getElementById ( 'root' )
);

registerServiceWorker ();
