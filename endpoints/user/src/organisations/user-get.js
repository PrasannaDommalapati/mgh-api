'use strict';

const organisationApi = require('../../../../lib/wrapper/organisations');
const user = require('../../../../lib/user');
const lambda = require('@headforwards-spd/aws-lambda');

exports.handler = (event, context, callback) => {

    try {

        const userId = lambda.getUserId(event);

        user.getUserOrganisation(userId, ['organisationId'])
            .then(
                userOrganisation => organisationApi.userGet(userOrganisation.organisationId),
                error => lambda.handleError(error, callback, 'Could not fetch user organisation.')
            )
            .then(
                organisation => lambda.handleSuccess(organisation, callback),
                error => lambda.handleError(error, callback, 'Could not fetch organisation.')
            );

    } catch (error) {

        lambda.handleError(error, callback);
    }
};
