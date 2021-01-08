'use strict';

const AuctionParser = require('./auctions/parser').parse;

const response = {
    statusCode: 200
};

module.exports = exports = async (event) => {
    try {
        await AuctionParser(event.region, event.index, event.token, event.url, event.ledger);
    }
    catch (e) {
        console.log(e);
        response.statusCode = 404;
        response.body = e.toString();
    }

    return response;
};