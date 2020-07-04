// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AccountInfoService }           from './AccountInfoService';
import { InventoryService }             from './InventoryService';
import { InventoryTagsController }      from './InventoryTagsController';
import * as entitlements                from './util/entitlements';
import { InventoryController }          from 'cardmotron';
import { assert, crypto, excel, ProgressController, randomBytes, RevocableContext, SingleColumnContainerView, StorageContext, util } from 'fgc';
import * as bcrypt                      from 'bcryptjs';
import _                                from 'lodash';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';

const STORE_FLAGS               = '.vol_flags';
const STORE_NETWORKS            = '.vol_networks';

//================================================================//
// AppStorageService
//================================================================//
export class AppStorageService {

    //----------------------------------------------------------------//
    constructor ( storageContext ) {

        storageContext = storageContext || new StorageContext ();

        const flags = {
            promptFirstNetwork:         true,
            promptFirstAccount:         true,
            promptFirstTransaction:     true,
        };

        storageContext.persist ( this, 'flags',             STORE_FLAGS,                flags );
        storageContext.persist ( this, 'networks',          STORE_NETWORKS,             {}); // account names index by network name

        this.storage = storageContext;
    }
}
