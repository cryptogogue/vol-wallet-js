// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AccountKeyFieldController }    	from './AccountKeyFieldController';
import { AssetSelectionFieldController }    from './AssetSelectionFieldController';
import { ConstFieldController }             from './ConstFieldController';
import { CryptoKeyFieldController }         from './CryptoKeyFieldController';
import { IntegerFieldController }           from './IntegerFieldController';
import { SchemaFieldController }            from './SchemaFieldController';
import { StringFieldController }            from './StringFieldController';
import { TextFieldController }              from './TextFieldController';
import { VOLFieldController }               from './VOLFieldController';

export const FIELD_CLASS = {
    ACCOUNT_KEY:        AccountKeyFieldController,
    ASSET_SELECTION:    AssetSelectionFieldController,
    CONST:              ConstFieldController,
    CRYPTO_KEY:         CryptoKeyFieldController,
    INTEGER:            IntegerFieldController,
    SCHEMA:             SchemaFieldController,
    STRING:             StringFieldController,
    TEXT:               StringFieldController,
    VOL:                VOLFieldController,
}
