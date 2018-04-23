'use strict';

const organisationApi = require('../../../../lib/wrapper/organisations');
const lambda          = require('@headforwards-spd/aws-lambda');

exports.handler = (event, context, callback) => {

    try {

        const organisationId = event.pathParameters.organisationId;

        lambda.checkUserGroup(event, 'Admin')
              .then(() => organisationApi.get(organisationId))
              .then(organisation => lambda.handleSuccess(organisation, callback))
              .catch(error => lambda.handleError(error, callback, 'Could not fetch organisation.'));

    } catch (error) {

        lambda.handleError(error, callback);
    }
};
