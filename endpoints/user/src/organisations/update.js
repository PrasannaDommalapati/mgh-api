'use strict';

const organisationApi = require('../../../../lib/wrapper/organisations');
const lambda    = require('@headforwards-spd/aws-lambda');

exports.handler = (event, context, callback) => {

    try {

        const organisation = lambda.extractData(event);

        lambda.checkUserGroup(event, 'Admin')
            .then(
                () => organisationApi.update(organisation.organisationId, organisation),
                error => lambda.handleError(error, callback, 'User not in admin group.')
            )
            .then(
                organisation => lambda.handleSuccess(organisation, callback),
                error => lambda.handleError(error, callback, 'Couldn\'t update the organisation.')
            );

    } catch (error) {

        lambda.handleError(error, callback);
    }
};