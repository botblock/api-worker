const listsData = require('../util/getLists')();
const featuresData = require('../util/getFeatures')();

module.exports = id => {
    const list = listsData.find(list => list.id === id);
    if (!list) return null;

    // Load full features
    list.features = featuresData.map(feature => ({
        ...feature,
        value: list.features.includes(feature.id) ? 1 : 0,
    })).sort((a, b) => {
        if (a.value !== b.value) return a.value ? -1 : 1;
        if (a.display !== b.display) return a.display > b.display ? -1 : 1;
        return a.name.localeCompare(b.name) ? 1 : -1;
    });

    return list;
};