'use strict';

const user = require('../../../../lib/user');
const organisationApi = require('../../../../lib/wrapper/organisations');
const lambda    = require('@headforwards-spd/aws-lambda');

exports.handler = (event, context, callback) => {

    try {

        lambda.checkUserGroup(event, 'Admin')
            .then(
                () => organisationApi.list(event),
                error => lambda.handleError(error, callback, 'Couldn\'t fetch the organisation id.')
            )
            .then(
                organisations => lambda.handleSuccess(organisations, callback),
                error => lambda.handleError(error, callback, 'Couldn\'t list the organisations.')
            );

    } catch (e) {

        lambda.handleError(e, callback);
    }
};
