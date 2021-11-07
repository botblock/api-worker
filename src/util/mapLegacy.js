const legacy = require('../../data/data/legacy.json');

module.exports = val => legacy[val] || val;
