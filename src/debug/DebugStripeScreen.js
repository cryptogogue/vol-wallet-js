// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { StripeCheckoutForm }           from './StripeCheckoutForm';
import { assert, excel, hooks, RevocableContext, SingleColumnContainerView, storage, util } from 'fgc';
import React, { Component }             from 'react';
import { Button, Form, Grid, Header, Segment } from 'semantic-ui-react';
import { Elements, StripeProvider } from 'react-stripe-elements';

const STRIPE_SETTINGS   = 'vol_stripe_settings';

//================================================================//
// DebugStripeScreen
//================================================================//
export class DebugStripeScreen extends Component {

    //----------------------------------------------------------------//
    constructor ( props ) {
        super ( props );

        const settings = storage.getItem ( STRIPE_SETTINGS );

        let state = {
            stripeURL:          ( settings && settings.stripeURL ) || '',
            stripePublicKey:    ( settings && settings.stripePublicKey ) || '',
            isReady:            false,
        };

        this.state = state;
    }

    //----------------------------------------------------------------//
    handleChange ( event ) {

        this.setState ({[ event.target.name ]: event.target.value });
    }

    //----------------------------------------------------------------//
    handleSubmit () {

        let settings = {
            stripeURL: this.state.stripeURL,
            stripePublicKey: this.state.stripePublicKey,
        };
        storage.setItem ( STRIPE_SETTINGS, settings );

        this.setState ({ isReady: true });
    }

    //----------------------------------------------------------------//
    render () {

        const { isReady, stripeURL, stripePublicKey } = this.state;
        const isEnabled = ( stripeURL.length > 0 ) && ( stripePublicKey.length > 0 );

        let onChange        = ( event ) => { this.handleChange ( event )};
        let onSubmit        = () => { this.handleSubmit ()};

        let stripeForm;

        if ( isReady ) {
            stripeForm = (
                <StripeProvider apiKey = { stripePublicKey }>
                    <div className = "example">
                        <Elements>
                            <StripeCheckoutForm stripeURL = { stripeURL }/>
                        </Elements>
                    </div>
                </StripeProvider>
            );
        }

        return (
            <SingleColumnContainerView title = 'Test Stripe Payment'>

                <Form size = "large" onSubmit = { onSubmit }>
                    <Segment stacked>
                        <Form.Input
                            fluid
                            icon = "lock"
                            iconPosition = "left"
                            placeholder = "Stripe URL"
                            name = "stripeURL"
                            value = { this.state.stripeURL }
                            onChange = { onChange }
                        />
                        <Form.Input
                            fluid
                            icon = "lock"
                            iconPosition = "left"
                            placeholder = "Stripe public key"
                            name = "stripePublicKey"
                            value = { this.state.stripePublicKey }
                            onChange = { onChange }
                        />
                        <Button color = "red" fluid size = "large" disabled = { !isEnabled }>
                            Create form
                        </Button>
                    </Segment>
                </Form>

                { stripeForm }

            </SingleColumnContainerView>
        );
    }
}
