module.exports.isInteger = val => typeof val === 'number' && Number.isInteger(val);
module.exports.isSnowflake = val => typeof val === 'string' && /^\d+$/.test(val) && val.length >= 16;
