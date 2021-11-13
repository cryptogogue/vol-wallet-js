// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { observer }                         from 'mobx-react';
import React                                from 'react';
import * as UI                              from 'semantic-ui-react';

//================================================================//
// ConsensusWarning
//================================================================//
export const ConsensusWarning = observer (( props ) => {

    const { networkService } = props;
    const consensusService = networkService.consensusService;

    const consensusURL = `/net/${ networkService.networkID }/consensus`;

    return (
        <React.Fragment>

            <If condition = { consensusService.isBlocked }>
                <UI.Message icon warning>
                    <UI.Icon name = 'warning sign'/>
                    <UI.Message.Content>
                        <UI.Message.Header>Warning</UI.Message.Header>
                        <p>Consensus appears to be blocked. This may resolve in time, but you can also <a href = { consensusURL }>manually reset</a> the consensus service.</p>
                    </UI.Message.Content>
                </UI.Message>
            </If>

        </React.Fragment>
    );
});
