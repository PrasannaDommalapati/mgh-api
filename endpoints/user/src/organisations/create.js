'use strict';

const api    = require('../../../../lib/wrapper/organisations');
const lambda = require('@headforwards-spd/aws-lambda');

exports.handler = (event, context, callback) => {

    try {

        const organisation = extractData(event);

        lambda.checkUserGroup(event, 'admin')
              .then(() => api.create(organisation))
              .catch(error => handleError(error, callback, 'Could not create an organisation.'));

    } catch (e) {

        handleError(e, callback);
    }
};