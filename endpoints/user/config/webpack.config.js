const endpoints = require('./endpoints');
const config    = require('../../../config/webpack-default');

config.entry = endpoints;

module.exports = config;