'use strict';

const fs = require('fs');
const childprocess = require('child_process').execSync;
const path = require('path');
const AuctionParser = require('./auctions/parser');
const KVDB = require('./KVDB');

const response = {
    statusCode: 200
};

const getDB = (key) => {
    const fpath = path.join(__dirname, 'data');
    const db = new KVDB(fpath, key);
    db.load();
    return db;
};

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

module.exports = exports = async (event, context) => {
    try {
        const key = `${event.region}-${event.index}`;
        const db = getDB(key);
        await AuctionParser(db, event.index, event.token, event.url, context);
        renameOldDB(db);
        db.flush();
        db.close();
        createDiff(db);
    }
    catch (e) {
        console.log(e);
        response.statusCode = 404;
        response.body = e.toString();
    }

    return response;
};