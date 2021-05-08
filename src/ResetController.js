// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { observable, runInAction } from 'mobx';

//================================================================//
// ResetController
//================================================================//
export class ResetController {

    @observable reset = false;

    //----------------------------------------------------------------//
    constructor ( appState, check ) {

        this.onStorageEvent = ( event ) => {
            if ( !check ()) {
                runInAction (() => {
                    this.reset = true;
                });
            }
        };

        window.addEventListener ( 'storage', this.onStorageEvent ); 
    }

    //----------------------------------------------------------------//
    finalize () {
        window.removeEventListener ( 'storage', this.onStorageEvent );
    }
}
