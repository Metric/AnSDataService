'use strict';

const zlib = require('zlib');

class Utils {
    static parseReviver(key, value) {
        if (typeof value === 'string' && /^\d+n$/.test(value)) {
            return BigInt(value.slice(0, -1));
        }
        return value;
    }

    static stringifyReplacer(key, value) {
        if (typeof value === 'bigint') {
            return value.toString() + 'n';
        } else {
            return value;
        }
    }

    static createJson(db, region, compress) {
        let fstream = '{\r\n';
        const keys = Object.keys(db.cache);
        let sep = '';

        keys.forEach(id => {
            if (id !== 'updated') {
                const c = db.get(id);

                if (c) {
                    const s = `"${id}": ${JSON.stringify(c, Utils.stringifyReplacer)}`;
                    fstream += sep + s;
                    sep = ',\r\n';
                }
            }
        });

        fstream += '}';

        const rdata = `{
            "timestamp": ${Date.now()},
            "region": "${region}",
            "data": ${fstream}
        }`;

        if (compress) {
            return zlib.deflateSync(rdata);
        }
        
        return rdata;
    }
}

module.exports = exports = Utils;