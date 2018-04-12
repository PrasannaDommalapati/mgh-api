'use strict';

const organisationApi = require('../../../../lib/wrapper/organisations');
const lambda          = require('@headforwards-spd/aws-lambda');

exports.handler = (event, context, callback) => {

    try {

        const organisationId = event.pathParameters.organisationId;

        lambda.checkUserGroup(event, 'Admin')
              .then(
                  () => organisationApi.remove(organisationId),
                  error => lambda.handleError(error, callback, 'User not in admin group.')
              )
              .then(
                  organisation => lambda.handleSuccess(organisation, callback),
                  error => lambda.handleError(error, callback, 'Couldn\'t delete the organisation.')
              );

    } catch (error) {

        lambda.handleError(error, callback);
    }
};