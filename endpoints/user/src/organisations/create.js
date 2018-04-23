'use strict';

const organisationApi = require('../../../../lib/wrapper/organisations');
const lambda          = require('@headforwards-spd/aws-lambda');

exports.handler = (event, context, callback) => {

    try {

        const organisation = lambda.extractData(event);

        lambda.checkUserGroup(event, 'Admin')
              .then(() => organisationApi.create(organisation))
              .catch(error => lambda.handleError(error, callback, 'Could not create an organisation.'));

    } catch (e) {

        lambda.handleError(e, callback);
    }
};