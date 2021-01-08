const utils = require('../utils');
const Utils = require('../utils');

class Auction {
    static parse(str, items) {
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
                let price = 0;
                let quantity = json.quantity || 0;

                //we ignore anything that isn't a buyout or unit_price (unit_price is new commodity)
                if (json.buyout != null || json.unit_price != null) {
                    //otherwise new unit price for commodity
                    if(json.unit_price != null) {
                        price = Math.floor(json.unit_price / 100);
                    }
                    else if (json.buyout != null) { 
                        price = Math.floor(json.buyout / 100);
                    } 

                    if(price === 0 || Number.isNaN(price) || !Number.isFinite(price)) {
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

                if (bonusLists) {
                    extra = bonusLists;
                }

                extra.sort((a,b) => {
                    return a - b;
                });

                const modifiers = json.item.modifiers;
                let extraMod = [];

                if (modifiers) {
                    for(let i = 0; i < modifiers.length; ++i) {
                        const m = modifiers[i];
                        if (m && m.type && m.value && parseInt(m.type) != 9) {
                            extraMod.push(Utils.uint8Bytes(m.type));
                            extraMod.push(Utils.uint32Bytes(m.value));
                        }
                    }
                }

                extra = extra.sort((a,b) => a - b);

                const bonusBytes = extra.map(m => Utils.uint16Bytes(m)).join('');
                const bonusCount = Utils.uint8Bytes(extra.length);
                const modBytes = extraMod.join('');
                const modCount = Utils.uint8Bytes(Math.floor(extraMod.length / 2));

                let full = null;
                let bonusOnly = null;
                let baseOnly = null;

                if (json.item.pet_species_id != null) {
                    let key = `${Utils.uint32Bytes(json.item.pet_species_id)}${Utils.uint8Bytes(parseInt(json.item.pet_level) < 25 ? 1 : 25)}${Utils.uint8Bytes(json.item.pet_quality_id)}`
                    key = Buffer.from(key).toString('base64');
                    full = `p${key}`;
                    key = `${Utils.uint32Bytes(json.item.pet_species_id)}${Utils.uint8Bytes(parseInt(json.item.pet_level) < 25 ? 1 : 25)}`;
                    key = Buffer.from(key).toString('base64');
                    bonusOnly = `p${key}`;
                    key = `${Utils.uint32Bytes(json.item.pet_species_id)}`;
                    key = Buffer.from(key).toString('base64');
                    baseOnly = `p${key}`;
                }
                else {
                    if (extra.length > 0 && extraMod.length > 0) {
                        let key = `${Utils.uint32Bytes(json.item.id)}${bonusCount}${bonusBytes}${modCount}${modBytes}`
                        key = Buffer.from(key).toString('base64');
                        full = `i${key}`;
                        key = `${Utils.uint32Bytes(json.item.id)}${bonusCount}${bonusBytes}`;
                        key = Buffer.from(key).toString('base64');
                        bonusOnly = `i${key}`;
                        key = `${Utils.uint32Bytes(json.item.id)}`;
                        key = Buffer.from(key).toString('base64');
                        baseOnly = `i${key}`;
                    }
                    else if(extra.length > 0 && extraMod.length == 0) {
                        let key = `${Utils.uint32Bytes(json.item.id)}${bonusCount}${bonusBytes}`;
                        key = Buffer.from(key).toString('base64');
                        bonusOnly = `i${key}`;
                        key = `${Utils.uint32Bytes(json.item.id)}`;
                        key = Buffer.from(key).toString('base64');
                        baseOnly = `i${key}`;
                    }
                    else if(extra.length == 0 && extraMod.length > 0) {
                        let key = `${Utils.uint32Bytes(json.item.id)}${Utils.uint8Bytes(0)}${modCount}${modBytes}`
                        key = Buffer.from(key).toString('base64');
                        full = `i${key}`;
                        key = `${Utils.uint32Bytes(json.item.id)}`;
                        key = Buffer.from(key).toString('base64');
                        baseOnly = `i${key}`;
                    }
                    else {
                        let key = `${Utils.uint32Bytes(json.item.id)}`;
                        key = Buffer.from(key).toString('base64');
                        baseOnly = `i${key}`;
                    }
                }

                if(typeof json.id === 'number' && quantity > 0) {
                    if (full) {
                        const tracker = items[full] || {quantity: 0, prices: []};
                        items[full] = tracker;
                        tracker.quantity += quantity;
                        tracker.prices.push(price);
                    }
                    if (bonusOnly) {
                        const tracker = items[bonusOnly] || {quantity: 0, prices: []};
                        items[bonusOnly] = tracker;
                        tracker.quantity += quantity;
                        tracker.prices.push(price);
                    }
                    if (baseOnly) {
                        const tracker = items[baseOnly] || {quantity: 0, prices: []};
                        items[baseOnly] = tracker;
                        tracker.quantity += quantity;
                        tracker.prices.push(price);
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

module.exports = exports = Auction;