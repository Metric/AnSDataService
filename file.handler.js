'use strict';

const fs = require('fs');
const path = require('path');

const FPath = path.join(__dirname, 'data');
const FName = "{0}-{1}.kvdb";
const FNameDiff = "{0}-{1}.kvdb.diff{2}";
const FNameRegion = "{0}.kvdb";
const FNameRegionDiff = "{0}.kvdb.diff{1}";

exports.modified = (region, index, diff) => {

    let fname = null;
    let fpath = null;

    //if the index is less than zero
    //then we want the region db
    if (index < 0) {
        if (diff != null) {
            fname = FNameRegionDiff.replace('{0}', region).replace('{1}', diff);
            fpath = path.join(FPath, fname);
        }
        else {
            fname = FNameRegion.replace('{0}', region);
            fpath = path.join(FPath, fname);
        }
    }
    else {
        if (diff != null) {
            fname = FNameDiff.replace('{0}', region).replace('{1}', index).replace('{2}', diff);
            fpath = path.join(FPath, fname);
        }
        else {
            fname = FName.replace('{0}', region).replace('{1}', index);
            fpath = path.join(FPath, fname);
        }
    }

    if (fs.existsSync(fpath)) {
        return fs.statSync(fpath).mtimeMs;
    }

    return null;
};

exports.exists = (region, index, diff) => {
    let fname = null;
    let fpath = null;

    //if the index is less than zero
    //then we want the region db
    if (index < 0) {
        if (diff != null) {
            fname = FNameRegionDiff.replace('{0}', region).replace('{1}', diff);
            fpath = path.join(FPath, fname);
        }
        else {
            fname = FNameRegion.replace('{0}', region);
            fpath = path.join(FPath, fname);
        }
    }
    else {
        if (diff != null) {
            fname = FNameDiff.replace('{0}', region).replace('{1}', index).replace('{2}', diff);
            fpath = path.join(FPath, fname);
        }
        else {
            fname = FName.replace('{0}', region).replace('{1}', index);
            fpath = path.join(FPath, fname);
        }
    }

    return fs.existsSync(fpath);
};

exports.get = (region, index, diff) => {
    let fname = null;
    let fpath = null;

    //if the index is less than zero
    //then we want the region db
    if (index < 0) {
        if (diff != null) {
            fname = FNameRegionDiff.replace('{0}', region).replace('{1}', diff);
            fpath = path.join(FPath, fname);
        }
        else {
            fname = FNameRegion.replace('{0}', region);
            fpath = path.join(FPath, fname);
        }
    }
    else {
        if (diff != null) {
            fname = FNameDiff.replace('{0}', region).replace('{1}', index).replace('{2}', diff);
            fpath = path.join(FPath, fname);
        }
        else {
            fname = FName.replace('{0}', region).replace('{1}', index);
            fpath = path.join(FPath, fname);
        }
    }

    if (fs.existsSync(fpath)) {
        return fs.readFileSync(fpath);
    }

    return null;
};