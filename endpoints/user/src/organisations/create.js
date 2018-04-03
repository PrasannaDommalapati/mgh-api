'use strict';

const organisationApi = require('../../../../lib/wrapper/organisations');
const lambda = require('@headforwards-spd/aws-lambda');

exports.handler = (event, context, callback) => {

    try {

        const organisation = lambda.extractData(event);

        lambda.checkUserGroup(event, 'Admin')
            .then(() => organisationApi.create(organisation),
                error => lambda.handleError(error, callback, 'Couldn\'t check user group.'))
            .then(result => lambda.handleSuccess(result, callback),
                error => lambda.handleError(error, callback, 'Could not create an organisation.'));

    } catch (e) {

        lambda.handleError(e, callback);
    }
};