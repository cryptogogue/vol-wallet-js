// Copyright (c) 2019 Cryptogogue, Inc. All Rights Reserved.

export function createTtsDeck(cards, imageServiceUrl, cardBackUrl) {

    let currentDeck = JSON.parse(`{
        "ObjectStates": [
            {
                "Name": "DeckCustom",
                "ContainedObjects": [],
                "DeckIDs": [],
                "CustomDeck": {},
                "Transform": {
                    "posX": 0,
                    "posY": 1,
                    "posZ": 0,
                    "rotX": 0,
                    "rotY": 180,
                    "rotZ": 180,
                    "scaleX": 1,
                    "scaleY": 1,
                    "scaleZ": 1
                }
            }
        ]
        }`);
    for (const [i, card] of cards.entries()) {

        let name = card.fields["C_NAME"].value;
        if (!name) {
            name = card.fields["D_NAME"].value;
        }

        let cardIdName = JSON.parse(`{
                "CardID": "",
                "Name": "Card",
                "Nickname": "",
                "Transform": {
                    "posX": 0,
                    "posY": 0,
                    "posZ": 0,
                    "rotX": 0,
                    "rotY": 180,
                    "rotZ": 180,
                    "scaleX": 1,
                    "scaleY": 1,
                    "scaleZ": 1
                }
            }`);
        cardIdName.CardID = String((i+1)*100);
        cardIdName.Nickname = name;
        currentDeck.ObjectStates[0].ContainedObjects.push(cardIdName);
        currentDeck.ObjectStates[0].DeckIDs.push(String((i+1)*100));
        let cardInfo = JSON.parse(`{
            "FaceURL": "",
                "BackURL": "",
                    "NumHeight": 1,
                        "NumWidth": 1,
                            "BackIsHidden": true
            }`);
        cardInfo.FaceURL = `${imageServiceUrl}/owner/${card.owner}/assets/${card.assetID}/asset.png`;
        cardInfo.BackURL = cardBackUrl;
        currentDeck.ObjectStates[0].CustomDeck[i+1] = cardInfo;
    }
    return currentDeck;
}
