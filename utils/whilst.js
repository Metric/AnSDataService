
module.exports = (condition, action) => {
    const whilst = () => {
        try {
            if (!condition()) return Promise.resolve();
            return Promise.resolve(action()).then(whilst);
        }
        catch (e) {
            return Promise.reject(e);
        }
    }

    return whilst();
};