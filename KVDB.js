'use strict';

const fs = require('fs');
const utils = require('util');
const path = require('path');
const zlib = require('zlib');
const async = require('async');
const deflate = utils.promisify(zlib.deflate);
const inflate = utils.promisify(zlib.inflate);
const writeFile = utils.promisify(fs.writeFile);
const readFile = utils.promisify(fs.readFile);

function parseReviver(key, value) {
    if (typeof value === 'string' && /^\d+n$/.test(value)) {
        return BigInt(value.slice(0, -1));
    }
    return value;
}

function stringifyReplacer(key, value) {
    if (typeof value === 'bigint') {
        return value.toString() + 'n';
    } else {
        return value;
    }
}

class KVDB {
    constructor(path, name) {
        this.name = name;
        this.cache = {};
        this.path = path;
    }

    set(key, v) {
        this.cache[key] = v;
    }

    getWritableData(key, v, compress) {
        let t = 0;
        if (Array.isArray(v)) {
            if (compress) {
                v = zlib.deflateSync(JSON.stringify(v, stringifyReplacer)).toString('base64');
            }
            else {
                v = Buffer.from(JSON.stringify(v, stringifyReplacer)).toString('base64');
            }
            t = 2;
        }
        else if(typeof v === 'object') {
            if (compress) {
                v = zlib.deflateSync(JSON.stringify(v, stringifyReplacer)).toString('base64');
            }
            else {
                v = Buffer.from(JSON.stringify(v, stringifyReplacer)).toString('base64');
            }

            t = 1;
        }
        else if(typeof v === 'number') {
            t = 0;
        }
        else if(typeof v === 'bigint') {
            v = v.toString() + 'n';
            t = 0;
        }
        else if(typeof v === 'string') {
            if (compress) {
                v = zlib.deflateSync(v).toString('base64');
            }
            else {
                v = Buffer.from(v).toString('base64');
            }

            t = 3;
        }
        else if (typeof v === 'boolean') {
            v = v ? 1 : 0;
            t = 4;
        }

        return `${key};${t};${v}\r\n`;
    }

    flush(compress, innerCompress) {
        const str = this.toString(compress, innerCompress);
        const fpath = path.join(this.path, `${this.name}.kvdb`);
        fs.writeFileSync(fpath, str);
    }

    toString(compress, innerCompress) {
        let data = '';

        const keys = Object.keys(this.cache);

        for(let i = 0; i < keys.length; ++i) {
            const k = keys[i];
            const v = this.cache[k];
            const str = this.getWritableData(k, v, innerCompress);
            data += str;
        }

        if(compress) {
            return zlib.deflateSync(data);
        }

        return data;
    }

    get(key) {
        return this.cache[key];
    }

    getValueForType(v, t, decompress) {
        if(t === 1 || t === 2) {
            if (decompress) {
                return JSON.parse(zlib.inflateSync(Buffer.from(v, 'base64')).toString('utf8'), parseReviver);
            }
            else {
                return JSON.parse(Buffer.from(v, 'base64').toString('utf8'), parseReviver);
            }
        }
        else if(t === 0) {
            if (/^\d+n$/.test(v)) {
                return BigInt(v.slice(0, -1));
            }

            return parseFloat(v);
        }
        else if(t === 3) {
            if (decompress) {
                return zlib.inflateSync(Buffer.from(v, 'base64')).toString('utf8');
            }
            else {
                return Buffer.from(v, 'base64').toString('utf8');
            }
        }
        else if(t === 4) {
            const i = parseInt(v);

            return i === 1 ? true : false;
        }
        else {
            return null;
        }
    }

    close() {
        this.cache = {};
    }

    /**
     * data is a Buffer object
     * @param {*} data 
     * @param {*} decompress 
     */
    fromString(data, decompress, innerDecompress) {
        if(decompress) {
            data = zlib.inflateSync(data).toString('utf8');
        }
        else {
            data = data.toString('utf8');
        }

        const lines = data.split('\r\n');

        for(let i = 0; i < lines.length; ++i) {
            const l = lines[i];
            if (l[0] !== '!') {
                const split = l.split(';');
                this.cache[split[0]] = this.getValueForType(split[2], parseInt(split[1]), innerDecompress);
            }
        }
    }

    load(decompress, innerDecompress) {
        const fpath = path.join(this.path, `${this.name}.kvdb`);
        
        if (fs.existsSync(fpath)) {
            const data = fs.readFileSync(fpath);
            this.fromString(data, decompress, innerDecompress);
        }
    }
}

module.exports = exports = KVDB;