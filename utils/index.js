'use strict';

const uint16Buffer = Buffer.allocUnsafe(2);
const uint32Buffer = Buffer.allocUnsafe(4);
const uint64Buffer = Buffer.allocUnsafe(8);

const uint16 = new Array(2);
const uint32 = new Array(4);
const uint64 = new Array(8);

const crypto = require('crypto');

class Utils {
    static hash(s) {
        //creating hash object 
        const h = crypto.createHash('sha512');
         //passing the data to be hashed
        const data = h.update(s, 'utf8');
        //Creating the hash in the required format
        return data.digest('hex');
    }

    static uint8(s) {
        if (s.length < 1) {
            return 0;
        }

        return s.charCodeAt(0);
    }

    static uint8Bytes(c) {
        return String.fromCharCode.apply(String, [c]);
    }

    static uint32(s) {
        if (s.length < 4) {
            return 0;
        }

        for (let i = 0; i < 4; ++i) {
            uint32[i] = s.charCodeAt(i);
        }

        return Buffer.from(uint32).readUInt32BE(0);
    }

    static uint16(s) {
        if (s.length < 2) {
            return 0;
        }

        for (let i = 0; i < 2; ++i) {
            uint16[i] = s.charCodeAt(i);
        }

        return Buffer.from(uint16).readUInt16BE(0);
    }

    static uint64(s) {
        if (s.length < 8) {
            return 0;
        }

        for (let i = 0; i < 8; ++i) {
            uint64[i] = s.charCodeAt(i);
        }

        return Buffer.from(uint64).readBigUInt64BE();
    }

    static uint16Bytes(c) {
        if (typeof c !== "number") {
            c = parseInt(c);
        }
        uint16Buffer.writeUInt16BE(c, 0);
        return String.fromCharCode.apply(String, [...uint16Buffer]);
    }

    static uint32Bytes(c) {
        if (typeof c !== "number") {
            c = parseInt(c);
        }
        uint32Buffer.writeUInt32BE(c, 0);
        return String.fromCharCode.apply(String, [...uint32Buffer]);
    }

    static uint64Bytes(c) {
        if (typeof c !== 'bigint') {
            c = BigInt(c);
        }

        uint64Buffer.writeBigUInt64BE(c, 0);
        return String.fromCharCode.apply(String, [...uint64Buffer]);
    }
}

module.exports = exports = Utils;