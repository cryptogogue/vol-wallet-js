// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

//----------------------------------------------------------------//
export const COMMAND_TYPE = {
    HARD_RESET:                 'HARD_RESET',
    SELECT_REWARD:              'SELECT_REWARD',
    SET_MINIMUM_GRATUITY:       'SET_MINIMUM_GRATUITY',
};

//----------------------------------------------------------------//
COMMAND_TYPE.friendlyNameForType = ( type ) => {

    switch ( type ) {
        case COMMAND_TYPE.HARD_RESET:					return 'Hard Reset';
        case COMMAND_TYPE.SELECT_REWARD:				return 'Select Reward';
        case COMMAND_TYPE.SET_MINIMUM_GRATUITY:			return 'Set Minimum Gratuity';
    }
    return 'UNKNOWN';
}