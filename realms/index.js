'use strict';
const request = require('request');
const fs = require('fs');
const path = require('path');
const async = require('async');
const url = "https://{region}.api.blizzard.com/data/wow/connected-realm/index?namespace=dynamic-{region}";

class Realms {
    constructor(json) {
        this.connected = [];
        this.slugs = [];
        this.nameToSlug = {};
        this.slugToName = {};
        this.indexToSlug = {};
        this.slugToIndex = {};
        this.slugToConnected = {};
        this.nameToConnected = {};
        this.parse(json);
    }

    parse(json) {
        json.forEach(connected => {
            const slugs = connected.realms.map(v => {
                return v.slug;
            });

            const slugsId = slugs.join(',');
            connected.slug = slugsId;

            const names = connected.realms.map(v => {
                return v.name;
            });

            this.slugToIndex[slugsId] = connected.id;
            this.slugToConnected[slugsId] = connected;
            this.indexToSlug[connected.id] = slugsId;
            
            for(let j = 0; j < slugs.length; ++j) {
                this.slugToIndex[slugs[j]] = connected.id;
                this.slugToName[slugs[j]] = names[j];
                this.nameToSlug[names[j]] = slugs[j];
                this.nameToConnected[names[j]] = connected;
                this.slugToConnected[slugs[j]] = connected;
            }


            this.slugs.push(slugsId);
            this.connected.push(connected);
        });
    }

    static getLive(region, token) {
        const regionURL = url.replace(/\{region\}/gi, region.toLowerCase());
        return new Promise((res, rej) => {
            request(
                {   method: 'GET',
                    url: `${regionURL}&access_token=${token}`,
                    gzip: true
                }, async (error, response, result) => {
                    if (error) {
                        rej(err);
                        return;
                    }

                    console.log('Got Live Connected Realm Index');

                    try {
                        const realms = [];
                        const data = JSON.parse(result);

                        await async.eachSeries(data.connected_realms, (r, cb) => {
                            const rurl = r.href;

                            request (
                                {
                                    method: 'GET',
                                    url: `${rurl}&access_token=${token}`,
                                    gzip: true
                                }, (error, response, result) => {
                                    if (error) {
                                        cb(error);
                                        return;
                                    }

                                    console.log('Got Live Connected Realms: ' + rurl);

                                    try {
                                        const realm = JSON.parse(result);
                                        realms.push(realm);
                                        cb();
                                    }
                                    catch(e) {
                                        cb(e);
                                    }
                                });
                        });

                        fs.writeFileSync(path.join(__dirname, `${region.toLowerCase()}-connected.json`), JSON.stringify(realms, null, 2));
                        res(realms);
                    }
                    catch (e) {
                        rej(e);
                    }
                });
        });
    }
}

module.exports = exports = Realms;