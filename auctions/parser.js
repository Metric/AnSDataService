'use strict';

const Stats = require('../utils/statistics');
const request = require('request');

const ParseAuctions = (db, index, token, url, context) => {
    return new Promise((res, rej) => {
        if (index == null) {
            res();
            return;
        }
        const items = {};

        if (!token || token.length <= 1 || !url || url.length <= 1) {
            console.log('no token or url');
            res();
            return;
        }

        let time = Date.now();

        request(
            {   method: 'GET', 
                url: `${url}&access_token=${token}`,
                gzip: true
            }, (error, response, result) => {
                if (result && result.length > 0) {
                    console.log('got realm auction data: ' + index + ' in ' + ((Date.now() - time) / 1000) + 's');
                    time = Date.now();
                    Stats.parseAuctions(result, items);
                    console.log('total items parse: ' + Object.keys(items).length);
                    time = (Date.now() - time) / 1000;
                    console.log('total time to parse auctions: ' + time + 's');
                    Stats.updateAverages(items, db, context);
                    console.log('done updating averages for realm: ' + index);
                }

                res();
            });
    });
};

module.exports = exports = ParseAuctions;

