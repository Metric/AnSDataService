'use strict';

const Bonuses = require('../static-data-processed/bonuses');
const ItemCurves = require('../static-data-processed/item-curves');
const Equippable = require('../static-data-processed/equippable');
const async = require('async');
const whilst = require('../utils/whilst');

const MAX_DAYS_TO_TRACK = 7;

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
        const half = Math.ceil(values.length * 0.25);
        const low = Math.ceil(values.length * 0.15);
        const valid = [];

        if (values.length == 0) {
            console.log('values length is zero');
            res([0, 0, 0, 0]);
            return;
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
                sum += results[i];
                valid.push(results[i]);
            }
            prev = results[i];
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
        if (end < 0) {
            end = (x.length - 1) + end;
        }
        
        if (end < 0) {
            return Statistics.averageValues(x);
        }

        let sum = 0;
        if (end < start) {
            for(let i = end; i <= start; ++i) {
                sum += x[i];
            }
        }
        else {
            for (let i = start; i <= end; ++i) {
                sum += x[i];
            } 
        }

        return Math.round(sum / (count + 1));
    }

    static update(item, data, db, context) {
        let r = db.get(item, false);
        
        const min = data[0];
        const avg = data[1];
        const sum = data[2];
        const num = data[3];

        let source = null;

        if(!r) {
            const days = [];
            for (let i = 0; i < MAX_DAYS_TO_TRACK; ++i) {
                days.push(avg);
            }
            source = [
                    avg,avg,avg,
                    min,
                    sum,num,
                    days,
                    new Date(Date.now()).getDay() + 1,
                    1
                ];
            db.set(item, source);
        }
        else {
            source = r;            
            const days = source[6];
            const dwnow = new Date(Date.now()).getDay() + 1;

            if (source[7] != dwnow) {
                source[8] = source[8] + 1;
                if (source[8] > MAX_DAYS_TO_TRACK) {
                    source[8] = 1; 
                }
            }
            
            source[7] = dwnow;
            
            const dayIndex = source[8];
            days[dayIndex - 1] = avg;

            source[0] = avg;
            source[1] = Statistics.averagePrevious(days, dayIndex - 1, 2);
            source[2] = Statistics.averageValues(days);
            source[3] = min;
            source[4] = sum;
            source[5] = num;

            db.set(item, source);
        }

        if (context) {
            const ctracker = context[item] || [[],[],[],[],[]];
            context[item] = ctracker;

            const recent = source[0];
            const threeday = source[1];
            const market = source[2];
            const min = source[3];
            const seen = source[5];

            ctracker[0].push(recent);
            ctracker[1].push(threeday);
            ctracker[2].push(market);
            ctracker[3].push(min);
            ctracker[4].push(seen);
        }
    }

    static updateAverages(items, db, context) {
        const keys = Object.keys(items);

        for (let i = 0; i < keys.length; ++i) {
            const k = keys[i];

            const tracker = items[k];
            const source = db.get(k);

            let prevCount = 0;
            let prevSum = 0;

            if (source) {
                prevSum = source[4];
                prevCount = source[5];
            }

            const data = Statistics.average(tracker, prevSum, prevCount);
            Statistics.update(k, data, db, context);
        }
    }

    static parseAuctions(str, items) {
        let cindex = str.indexOf('"auctions":');
        let end = -1;

        while(cindex > -1) {
            let objectLevel = 1;
            cindex = str.indexOf("{", cindex);
            end = -1;
            
            if (cindex == -1) {
                return;
            }

            let startIndex = cindex;
            while(startIndex < str.length) {
                ++startIndex;
                const c = str.substring(startIndex, startIndex+1);
                if (c == '{') {
                    ++objectLevel;
                }
                else if(c == '}') {
                    --objectLevel;
                    if (objectLevel <= 0) {
                        end = startIndex;
                        break;
                    }
                }
            }

            if (end == -1) {
                cindex = -1;
                return;
            }

            const chunk = str.substring(cindex, end+1);
            try {
                const json = JSON.parse(chunk);
                let ppu = 0;

                //we ignore anything that isn't a buyout or unit_price (unit_price is new commodity)
                if (json.buyout != null || json.unit_price != null) {
                    if (json.buyout != null) { 
                        ppu = Math.round(json.buyout / (json.quantity || 1));
                    } 
                    //otherwise new unit price for commodity
                    else if(json.unit_price != null) {
                        ppu = json.unit_price;
                    }

                    if(ppu === 0 || Number.isNaN(ppu) || !Number.isFinite(ppu)) {
                        cindex = end+1;
                        continue;
                    }
                }
                else {
                    cindex = end+1;
                    continue;
                }

                const bonusLists = json.item.bonus_lists;
                let extra = [];
                let curveUsed = false;
                let itemLevelChange = 0;

                if (bonusLists) {
                    extra = bonusLists;

                    for (let i = 0; i < extra.length; ++i) {
                        const bId = `${extra[i]}`;
                        if (Bonuses[bId]) {
                            const bonusChange = Bonuses[bId];

                            if (bonusChange.ilevel) {
                                const curve = ItemCurves[`${bonusChange.curveId}`];
                                itemLevelChange += curve;
                                curveUsed = true;
                            }
                            else {
                                itemLevelChange += bonusChange.level;
                                curveUsed = false;
                            }
                        }
                    }
                }

                extra = extra.sort((a,b) => a - b);

                let id = null;
                let idILevel = null;
                let baseId = null;
                let petLevelId = null;
                if (json.item.pet_species_id != null) {
                    // this is to eliminate unneeded
                    // pet values between 1 and 25
                    // only level 1 or 25
                    if (json.item.pet_level < 25) {
                        json.item.pet_level = 1;
                    }
                    id = `p:${json.item.pet_species_id}:${json.item.pet_level}:${json.item.pet_quality_id}`;
                    petLevelId = `p:${json.item.pet_species_id}:${json.item.pet_level}`;
                    baseId = `p:${json.item.pet_species_id}`;
                }
                else {
                    if (extra.length > 0) {
                        id = `i:${json.item.id}:${extra.join(':')}`;
                    }
                    else {
                        id = `i:${json.item.id}`;
                    }
                    baseId = `i:${json.item.id}`;

                    if (Math.abs(itemLevelChange) > 0) {
                        if (curveUsed) {
                            idILevel = `i:${json.item.id}(${itemLevelChange})`;
                        }
                        else {
                            const itemId = `${json.item.id}`;
                            if (Equippable[itemId]) {
                                const equipment = Equippable[itemId];
                                const ilevel = equipment + itemLevelChange;
                                idILevel = `i:${json.item.id}(${ilevel})`;
                            }
                        }
                    }
                }

                if(typeof json.id === 'number') {
                    const averageTracker = items[id] || [];
                    const baseTracker = items[baseId] || [];

                    if (idILevel) {
                        const iLevelTracker = items[idILevel] || [];
                        iLevelTracker.push(ppu);
                        items[idILevel] = iLevelTracker;
                    }
                    
                    if (id !== baseId) {
                        averageTracker.push(ppu);
                        baseTracker.push(ppu);
                        
                        items[id] = averageTracker;
                        items[baseId] = baseTracker;
                    }
                    else {
                        averageTracker.push(ppu);
                        items[id] = averageTracker;
                    }

                    if (petLevelId) {
                        const petLevelTracker = items[petLevelId] || [];
                        petLevelTracker.push(ppu);
                        items[petLevelId] = petLevelTracker;
                    }

                    cindex = end+1;
                }
                else {
                    cindex = end+1;
                }
            }
            catch (e) {
                console.log(`failed at char: ${cindex} and ${end}`);
                console.log(e);
                cindex = -1;
                return;
            }
        }
    }
}

module.exports = exports = Statistics;