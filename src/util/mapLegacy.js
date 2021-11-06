const legacy = require('../../data/legacy.json');

module.exports = val => legacy[val] || val;
