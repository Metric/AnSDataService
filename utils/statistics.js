'use strict';

//const Bonuses = require('../static-data-processed/bonuses');
//const ItemCurves = require('../static-data-processed/item-curves');
//const Equippable = require('../static-data-processed/equippable');
//const async = require('async');
//const whilst = require('../utils/whilst');

class Statistics {
    static stdev(x, avg) {
        const count = x.length;
        let dev = 0;
        if (count <= 1) {
            return 0;
        } 

        let i = 0;
        while (i < count) {
            dev += Math.pow(x[i] - avg, 2);
            ++i;
        }

        return Math.sqrt(dev / (count - 1));
    }

    static average(values, prevSum, prevCount) {
        const half = Math.ceil(values.length * 0.35);
        const low = Math.ceil(values.length * 0.15);
        const valid = [];

        if (values.length == 0) {
            console.log('values length is zero');
            return [0, 0, 0, 0];
        }

        let results = [];

        values.sort((a,b) => a - b);
        results = values;

        let prev = 0;
        let sum = 0;
        let mina = results[0];
        let count = 0;

        let i = 0;

        while (i < half) {
            if (i <= low || results[i] < prev * 1.2) {
                prev = results[i];
                sum += results[i];
                valid.push(results[i]);
            }
            ++i;
        }

        count = valid.length;

        if (count == 0) {
            return [0, 0, 0, 0];
        }

        let avg = Math.round(sum / count);
        
        let std = 0;
        std = Statistics.stdev(valid, avg);
        std = Math.round(std);

        let minValue = Math.round(avg - std * 1.5);
        let maxValue = Math.round(avg + std * 1.5);
        let num = 0;
        let lastSum = sum;

        sum = 0;
        i = 0;

        while (i < count) {
            const v = valid[i];
            if (v >= minValue && v <= maxValue) {
                sum += v;
                num += 1;
            }
            ++i;
        }

        if (num === 0) {
            sum = lastSum;
            num = count;
        }

        avg = Math.round((sum + prevSum) / (num + prevCount));
        return [mina, avg, sum, num];
    }

    static averageValues(x) {
        let sum = 0;
        for(let i = 0; i < x.length; ++i) {
            sum += x[i];
        }
        return Math.round(sum / Math.max(x.length, 1));
    }

    static averagePrevious(x, start, count) {
        let end = start - count;
        let c = 0;
        let sum = 0;
        for (let i = start; i >= end; --i) {
            if (i < 0) {
                let ri = x.length + i;
                if (ri >= 0 && ri < x.length) {
                    sum += x[ri];
                    ++c;
                }
            }
            else {
                if (i < x.length) {
                    sum += x[i];
                    ++c;
                }
            }
        }

        c = c <= 0 ? 1 : c;

        return Math.round(sum / c);
    }

    static min(values) {
        values.sort((a,b) => a - b);
        return values[0];
    }
}

module.exports = exports = Statistics;