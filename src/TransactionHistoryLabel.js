// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { PasswordInputField }       from './PasswordInputField';
import { TransactionHistoryModal }  from './TransactionHistoryModal';
import React, { useState }          from 'react';
import { observer }                 from 'mobx-react';
import * as UI                      from 'semantic-ui-react';

//================================================================//
// TransactionHistoryLabel
//================================================================//
export const TransactionHistoryLabel = observer (( props ) => {

    const { accountService } = props;
    const [ open, setOpen ] = useState ( false );

    const onClose = () => {
        setOpen ( false );
    }

    return (
        <React.Fragment>

            <TransactionHistoryModal
                accountService  = { accountService }
                open            = { open }
                onClose         = { onClose }
            />

            <UI.Label color = 'grey' onClick = {() => { accountService.transactionQueue.isLoaded && setOpen ( true )}}>
                <UI.Icon name = 'book'/>
                Tx
            </UI.Label>

        </React.Fragment>
    );
});
