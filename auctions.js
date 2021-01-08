'use strict';

//const childprocess = require('child_process').execSync;

const Auth = require('./blizzard/auth');
const RealmHandler = require('./realm.handler');
const Realms = require('./realms');
const fs = require('fs');
const path = require('path');
const KVDB = require('./KVDB');
const statistics = require('./utils/statistics');
const Utils = require('./utils');

const getDB = (key) => {
    const fpath = path.join(__dirname, 'data');
    const db = new KVDB(fpath, key);
    return db;
};

/*
const renameOldDB = (db) => {
    const fpath = path.join(db.path, db.name + '.kvdb');
    const npath = path.join(db.path, db.name + '.kvdb.old');

    if (fs.existsSync(fpath)) {
        fs.renameSync(fpath, npath);
    }
}

const createDiff = (db) => {
    const tpath = path.join(db.path, db.name + '.kvdb');
    const dpath = path.join(db.path, db.name + '.kvdb.old');
    const vcdiffpath = path.join(__dirname, 'vcdiff', 'open-vcdiff', 'build', 'vcdiff');
    const diffpath = path.join(db.path, db.name + '.kvdb.diff' + new Date(Date.now()).getUTCHours());
    const args = ['encode', '-dictionary', dpath, '<', tpath, '>', diffpath];
    const command = vcdiffpath + ' ' + args.join(' ');

    if (fs.existsSync(vcdiffpath) && fs.existsSync(tpath) && fs.existsSync(dpath)) {
        childprocess(command);
    }
}

const sumValues = (arr) => {
    let sum = 0;
    for (let i = 0; i < arr.length; ++i) {
        const t = arr[i];
        sum += t;
    }
    return sum;
};

const avgValues = (arr) => {
    let sum = 0;
    for (let i = 0; i < arr.length; ++i) {
        const t = arr[i];
        sum += t;
    }

    return Math.round(sum / arr.length);
};

const minValue = (arr) => {
    if (!arr || arr.length == 0) {
        return 0;
    }

    let min = arr[0];
    for (let i = 1; i < arr.length; ++i) {
        min = Math.min(min, arr[i]);
    }
    return min;
};

const processRegion = (db, tracker) => {
    const keys = Object.keys(tracker);
    for (let i = 0; i < keys.length; ++i) {
        const k = keys[i];
        const t = tracker[k];
        
        const recent = avgValues(t[0]);
        const threeday = avgValues(t[1]);
        const market = avgValues(t[2]);
        const min = minValue(t[3]);
        const seen = sumValues(t[4]);

        const source = db.get(k) || [0,0,0,0,0,0];
        source[0] = recent;
        source[1] = threeday;
        source[2] = market;
        source[3] = min;
        source[5] = seen;
        db.set(k, source);
    }
}*/

const getRegionData = async (region, token) => {
    const p = path.join(__dirname, "realms", `${region.toLowerCase()}-connected.json`);
    if (fs.existsSync(p)) {
        return JSON.parse(fs.readFileSync(p).toString("utf8"));
    }

    return await Realms.getLive(region, token);
};

const processRegion = async (region) => {
    let totalTime = Date.now();
    //let regionTracker = {};
    const auth = new Auth(region.toUpperCase());
    await auth.clientCred();

    const ledger = {};
    const realms = new Realms(await getRegionData(region, auth.token)).connected;

    let i = 0;
    while (i < realms.length) {
        const r = realms[i];

        await RealmHandler({
            'index': r.id,
            'url': r.auctions.href,
            'token': auth.token,
            'region': region.toUpperCase(),
            'ledger': ledger
        });
        ++i;
    }

    if (ledger) {
        const rdb = getDB(region.toUpperCase());

        let time = Date.now();
        console.log('updating region db');
        for (let k in ledger) {
            const track = ledger[k];
            const v = Utils.uint32Bytes(statistics.averageValues(track));
            const m = Utils.uint32Bytes(statistics.min(track));
            rdb.set(k, m+v);
        }

        rdb.flush();
        rdb.close();
        console.log(`region db complete ${(Date.now() - time) / 1000}s`);
    }

    console.log(`total time ${(Date.now() - totalTime) / 1000 / 60}m`);
}

const start = async () => {
    await processRegion(process.argv[2]);
};

start();