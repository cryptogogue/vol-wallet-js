// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { Transaction, TRANSACTION_TYPE }    from './Transaction';
import { TransactionFormController }        from './TransactionFormController';
import { FIELD_CLASS }                      from './TransactionFormFieldControllers';
import { Binding }                          from 'cardmotron';
import { assert, randomBytes, util }        from 'fgc';
import _                                    from 'lodash';
import { action, computed, extendObservable, observable, observe, reaction, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';

//================================================================//
// CraftingFormController
//================================================================//
export class CraftingFormController extends TransactionFormController {

    @observable binding             = false;
    @observable invocations         = [];
    @observable assetsUtilized      = {}; // reverse lookup into invocation and param

    //----------------------------------------------------------------//
    @action
    addInvocation ( methodName ) {

        const method = this.inventory.schema.methods [ methodName ];

        const assetParams = {};
        for ( let paramName in method.assetArgs ) {
            assetParams [ paramName ] = false;
        }

        const invocation = {
            methodName:         methodName,
            assetParams:        assetParams,
            constParams:        {},
            weight:             method.weight,
            maturity:           method.maturity,
        };

        this.invocations.push ( invocation );
        this.validate ();
        return this.invocations [ this.invocations.length - 1 ]; // because mobX
    }

    //----------------------------------------------------------------//
    @action
    affirmBinding () {
        if ( !this.binding ) {
            this.binding = new Binding (
                this.inventory.schema,
                this.inventory.assets,
                ( assetID ) => { return !this.appState.assetsUtilized.includes ( assetID )},
                ( assetID ) => { return ( this.assetsUtilized [ assetID ] !== true )}
            );
        }
        return this.binding;
    }

    //----------------------------------------------------------------//
    @computed get
    canAddInvocation () {

        for ( let invocation of this.invocations ) {            
            for ( let paramName in invocation.assetParams ) {
                if ( invocation.assetParams [ paramName ] === false ) return false;
            }
        }
        return true;
    }

    //----------------------------------------------------------------//
    constructor ( appState, inventory, singleInvocation ) {
        super ();

        this.inventory = inventory;
        this.initialize ( appState, TRANSACTION_TYPE.RUN_SCRIPT );

        extendObservable ( this, {
            singleInvocation: singleInvocation || false,
        });

        this.cancelBindingReaction = reaction (
            () => {
                return {
                    assets: this.inventory.assets,
                    assetsUtilized: _.cloneDeep ( this.assetsUtilized ), // necessary because of use in callback
                };
            },
            ( params ) => {
                this.binding = new Binding (
                    this.inventory.schema,
                    params.assets,
                    ( assetID ) => { return !this.appState.assetsUtilized.includes ( assetID )},
                    ( assetID ) => { return ( params.assetsUtilized [ assetID ] !== true )}
                );
            }
        );
    }

    //----------------------------------------------------------------//
    finalize () {

        this.cancelBindingReaction ();
    }

    //----------------------------------------------------------------//
    isSelected ( invocation, paramName, assetID ) {

        return ( invocation.assetParams [ paramName ] === assetID );
    }

    //----------------------------------------------------------------//
    isUtilized ( assetID ) {

        return ( this.assetsUtilized [ assetID ] === true );
    }

    //----------------------------------------------------------------//
    @action
    refreshBinding () {
        this.binding = false;
        return this.affirmBinding ();
    }

    //----------------------------------------------------------------//
    @action
    removeInvocation ( index ) {

        const invocation = this.invocations [ index ];
        for ( let paramName in invocation.assetParams ) {
            const paramValue = invocation.assetParams [ paramName ];
            delete this.assetsUtilized [ paramValue ];
        }
        this.invocations.splice ( index, 1 );
        this.validate ();
    }

    //----------------------------------------------------------------//
    @action
    reset () {
        this.invocations = [];
        this.assetsUtilized = {};
    }

    //----------------------------------------------------------------//
    @action
    setAssetParam ( invocation, paramName, assetID ) {

        const prevValue = invocation.assetParams [ paramName ];
        if ( assetID === prevValue ) return;

        if ( prevValue !== false ) {
            delete this.assetsUtilized [ prevValue ];
        }

        invocation.assetParams [ paramName ] = assetID;

        if ( assetID !== false ) {
            this.assetsUtilized [ assetID ] = true;
        }
        this.validate ();
    }

    //----------------------------------------------------------------//
    virtual_checkComplete () {

        return (( this.invocations.length > 0 ) && ( this.canAddInvocation ));
    }

    //----------------------------------------------------------------//
    virtual_composeBody () {

        let weight = 1;
        let maturity = 0; 

        for ( let invocation of this.invocations ) {
            weight += invocation.weight;
            maturity = maturity < invocation.maturity ? invocation.maturity : maturity;
        }

        const body = this.formatBody ();
        body.invocations = _.cloneDeep ( this.invocations );
        body.weight = weight;
        body.maturity = maturity;
        return body;
    }

    //----------------------------------------------------------------//
    virtual_decorateTransaction ( transaction ) {

        transaction.setAssetsUtilized ( Object.keys ( this.assetsUtilized ));
    }
}
