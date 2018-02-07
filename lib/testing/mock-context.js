'use strict';

const sinon = require('sinon');

module.exports = function () {

    let context     = this;

    context.succeed = sinon.stub();
    context.fail    = sinon.stub();
    context.reset   = function () {
        context.succeed.reset();
        context.fail.reset();
    };
};
