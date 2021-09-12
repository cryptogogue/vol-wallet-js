// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { KeyAndPasswordForm }                   from './KeyAndPasswordForm';
import { hooks, RevocableContext }              from 'fgc';
import { computed, observable, runInAction }    from 'mobx';
import { observer }                             from 'mobx-react';
import React, { useState }                      from 'react';
import ReactMarkdown                            from 'react-markdown'
import * as UI                                  from 'semantic-ui-react';

//================================================================//
// TermsOfServiceController
//================================================================//
export class TermsOfServiceController {

    @observable isBusy          = true;
    @observable text            = '';
    @observable digest          = '';

    //----------------------------------------------------------------//
    constructor ( networkService ) {

        this.revocable          = new RevocableContext ();
        this.networkService     = networkService;

        this.fetchTermsOfService ();
    }

    //----------------------------------------------------------------//
    async fetchTermsOfService () {

        try {

            const accountID = this.accountID;            
            let data = await this.revocable.fetchJSON ( this.networkService.getServiceURL ( `/tos` ));

            if ( data.contract ) {
                runInAction (() => {
                    this.text       = data.contract.text;
                    this.digest     = data.contract.digest;
                    this.isBusy     = false;
                });
                return;
            }
        }
        catch ( error ) {
            console.log ( 'AN ERROR!' );
            console.log ( error );
        }
        this.revocable.timeout (() => { this.fetchTermsOfService ()}, 1000 );
    }

    //----------------------------------------------------------------//
    finalize () {

        this.revocable.finalize ();
    }
}
