'use strict';

const Auc = require('../utils/auction');
const request = require('request');
const KVDB = require('../KVDB');
const path = require('path');
const Utils = require('../utils');
const statistics = require('../utils/statistics');

const getDB = (key) => {
    const db = new KVDB(path.join(__dirname, '..', 'data'), key);
    db.load();
    return db;
};

const updateDB = (db, items, ledger) => {
    for (let k in items) {
        if (k == '' || k == null || (k[0] != 'p' && k[0] != 'i')) {
            continue;
        }

        const prev = db.get(k);
        const tracker = items[k];

        let boffset = 0;

        const read = (i) => {
            boffset += i;
            return boffset;
        };

        const prevSum = prev ? Number(Utils.uint64(prev.substring(boffset, read(8))).toString()) : 0;
        const prevNum = prev ? Utils.uint32(prev.substring(boffset, read(4))) : 0;

        const avgs = [0,0,0,0,0,0,0];
        const dwnow = new Date(Date.now()).getDay();
        let day = dwnow;
        let dayIndex = 0;

        if (prev) {
            for (let i = 0; i < avgs.length; ++i) {
                const v = Utils.uint32(prev.substring(boffset,read(4)));
                avgs[i] = v;
            }
            dayIndex = Utils.uint8(prev.substring(boffset, read(1)));
            day = Utils.uint8(prev.substring(boffset, read(1)));

            if (day !== dwnow) {
                ++dayIndex;
                dayIndex = dayIndex % avgs.length;
            }
        }

        const results = statistics.average(tracker.prices, prevSum, prevNum);

        if (!prev) {
            for (let i = 0; i < avgs.length; ++i) {
                avgs[i] = results[1];
            }
        }
        else {
            avgs[dayIndex] = results[1];
        }

        const nsum = Utils.uint64Bytes(results[2]);
        const nnum = Utils.uint32Bytes(results[3]);
        const nmin = Utils.uint32Bytes(results[0]);
        const navgs = avgs.map(m => Utils.uint32Bytes(m)).join('');
        const nday = Utils.uint8Bytes(dwnow);
        const ndayIndex = Utils.uint8Bytes(dayIndex);
        const nrecent = Utils.uint32Bytes(results[1]);
        const nthree = Utils.uint32Bytes(statistics.averagePrevious(avgs, dayIndex, 2));
        const nmarket = Utils.uint32Bytes(statistics.averageValues(avgs));

        db.set(k, nsum+nnum+navgs+ndayIndex+nday+nmin+nrecent+nthree+nmarket);

        if (ledger) {
            const ltrack = ledger[k] || [];
            ledger[k] = ltrack;
            ltrack.push(results[1]);
        }
    }
};

const parse = (region, index, token, url, ledger) => {
    return new Promise((res, rej) => {
        if (index == null || region == null) {
            console.log('invalid index or region');
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
                    Auc.parse(result, items);
                    console.log('total items parse: ' + Object.keys(items).length);
                    time = (Date.now() - time) / 1000;
                    console.log('total time to parse auctions: ' + time + 's');

                    const db = getDB(`${region}-${index}`);
                    
                    time = Date.now();
                    console.log('updating items');
                    
                    updateDB(db, items, ledger);

                    db.flush();
                    db.close();
                                    
                    console.log(`done updating items ${((Date.now() - time) / 1000)}s`);
                }

                res();
            });
    });
};

module.exports = exports = {
    parse: parse,
    update: updateDB,
};

