
import { SingleColumnContainerView, storage }           from 'fgc';
import { observer }                                     from 'mobx-react';
import React, { useState }                              from 'react';
import { Redirect }                                     from 'react-router';
import { Link }                                         from 'react-router-dom';
import * as UI                                          from 'semantic-ui-react';

//const debugLog = function () {}
const debugLog = function ( ...args ) { console.log ( '@DIAGNOSTIC:', ...args ); }

//================================================================//
// VersionResetScreen
//================================================================//
export const WalletResetScreen = observer (( props ) => {

    const [ ready, setReady ]       = useState ( false );
    const [ done, setDone ]         = useState ( false );

    const reset = async () => {
        storage.clear ();
        await indexedDB.deleteDatabase ( 'volwal' );
        setDone ( true );
    }

    if ( done ) return (<Redirect to = { '/' }/>);

    return (
        <SingleColumnContainerView title = 'Hard Reset Your Wallet'>

            <UI.Message icon warning>

                <UI.Icon name = 'exclamation triangle'/>
                <UI.Message.Content>
                    <UI.Message.Header>Warning</UI.Message.Header>
                    If you're seeing this screen it's probably because your wallet
                    is out of date and there's no automatic upgrade path. To avoid
                    unstability, please clear local storage. When this is done, you'll
                    need to recreate your password and import your networks and accounts.
                    We hope you've stored your private keys and mnemonic phrases
                    outside of the wallet. If not, before you clear local storage,
                    use the diagnostic and recovery tool to manually export them.
                </UI.Message.Content>
            </UI.Message>

            <UI.Form size = "large">
                <UI.Segment stacked>

                    <UI.Button
                        fluid
                        color           = 'teal'
                        as              = { Link }
                        to              = '/util/diagnostic'
                    >
                        Go To Diagnostic and Recovery Tool
                    </UI.Button>

                    <UI.Divider/>

                    <UI.Button
                        fluid
                        color           = 'red'
                        onClick         = {() => { setReady ( true )}}
                    >
                        I have backed up my passwords and am ready to reset.
                    </UI.Button>

                    <If condition = { ready }>

                        <UI.Divider/>

                        <UI.Button
                            fluid
                            color           = 'red'
                            onClick         = {() => { reset ()}}
                        >
                            Hard Reset Wallet
                        </UI.Button>

                    </If>

                </UI.Segment>
            </UI.Form>

        </SingleColumnContainerView>
    );
});

