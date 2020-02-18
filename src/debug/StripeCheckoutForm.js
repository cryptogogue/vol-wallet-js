// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import React, { Component }         from 'react';
import { CardNumberElement, CardExpiryElement, CardCVCElement, PostalCodeElement, injectStripe } from 'react-stripe-elements';

//================================================================//
// StripeCheckoutFormInternal
//================================================================//
class StripeCheckoutFormInternal extends Component {

    //----------------------------------------------------------------//
    constructor ( props ) {
        super ( props );

        this.state = {
            success: false,
        };
    }

    //----------------------------------------------------------------//
    async handleSubmit () {

        this.setState ({ success: false });

        let { token } = await this.props.stripe.createToken ({ name: 'Name' });

        fetch ( this.props.stripeURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify ({ tokenID: token.id })
        })
        .then (( response ) => { return response.json (); })
        .then (( data ) => {

            console.log ( 'GOT STRIPE RESULT' );
            console.log ( data );

            if ( data.status && ( data.status === 'succeeded' )) {
                this.setState ({ success: true });
            }
        })
        .catch (( error ) => {

            // TODO: handle error
            console.log ( error );
        });
    }

    //----------------------------------------------------------------//
    render () {

        const { success } = this.state;

        let onSubmit = () => { this.handleSubmit ()};

        return (
            <div className = "checkout">
                <p>Would you like to complete the purchase?</p>
                <CardNumberElement/>
                <CardExpiryElement/>
                <CardCVCElement/>
                <PostalCodeElement/>
                <button onClick = { onSubmit }>Send</button>
                { success && ( <h2>GREAT SUCCESS!</h2>)}
            </div>
        );
    }
}
export const StripeCheckoutForm = injectStripe ( StripeCheckoutFormInternal );