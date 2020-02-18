// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { assert, excel, hooks, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import _                                    from 'lodash';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';

export const POLLING_STATUS = {
    UNKNOWN:        'UNKNOWN',
    ONLINE:         'ONLINE',
    OFFLINE:        'OFFLINE',
};

//================================================================//
// PollingService
//================================================================//
export class PollingService {

    //----------------------------------------------------------------//
    constructor () {
        
        this.revocable      = new RevocableContext ();

        extendObservable ( this, {
            polling:        {},
        });
    }

    //----------------------------------------------------------------//
    finalize () {

        this.revocable.finalize ();
    }

    //----------------------------------------------------------------//
    getStatus ( identifier, asyncGetInfo, checkIdentifier ) {

        let polling = this.polling [ identifier ];
        if ( polling ) return polling;

        // this.startPolling ( identifier, asyncGetInfo, checkIdentifier );
        assert ( typeof ( asyncGetInfo ) === 'function' );
        checkIdentifier = checkIdentifier || (() => { return true; });

        const poll = async () => {

            let status = POLLING_STATUS.OFFLINE;
            let info = false;

            try {
                info = await this.revocable.promise ( asyncGetInfo ( this.revocable, identifier ));
                status = info ? POLLING_STATUS.ONLINE : POLLING_STATUS.OFFLINE;
            }
            catch ( error ) {
            }

            if ( this.updateStatus ( identifier, checkIdentifier, status, info, false )) {
                this.revocable.timeout (() => {
                    if ( this.updateStatus ( identifier, checkIdentifier, status, info, true )) {
                        poll ();
                    }
                }, 10000 );
            }
        };

        this.revocable.timeout ( poll, util.randomInt ( 0 ));

        return {
            status:     POLLING_STATUS.UNKNOWN,
            info:       false,
            busy:       true,
        };
    }

    //----------------------------------------------------------------//
    @action
    updateStatus ( identifier, checkIdentifier, status, info, busy ) {

        if ( checkIdentifier ( identifier )) {
            this.polling [ identifier ] = {
                status:     status,
                info:       info,
                busy:       busy,
            };
            return true;
        }
        delete this.polling [ identifier ];
        return false;
    }
}
