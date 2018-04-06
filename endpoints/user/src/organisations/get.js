'use strict';

const organisationApi = require('../../../../lib/wrapper/organisations');
const user            = require('../../../../lib/user');
const lambda          = require('@headforwards-spd/aws-lambda');

exports.handler = (event, context, callback) => {

    try {

        const organisation = lambda.extractData(event);

console.log(organisation)
        lambda.checkUserGroup(event, 'Admin')
              .then(() => organisationApi.get(organisation.organisationId))
              .then(organisation => lambda.handleSuccess(organisation, callback))
              .catch(error => lambda.handleError(error, callback, 'Could not fetch organisation.'));

    } catch (error) {

        lambda.handleError(error, callback);
    }
};
