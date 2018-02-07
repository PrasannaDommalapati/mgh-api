'use strict';

const consignmentsApi = require('../../../lib/wrapper/consignments');
const {
          handleSuccess,
          handleError
      }               = require('aws-api-cognito');

exports.handler = (event, context, callback) => {

    try {

        let date      = event.requestContext.authorizer.date;
        let vehicleId = event.requestContext.authorizer.vehicleId;

        let roundId = vehicleId + '.' + date;

        consignmentsApi
            .driverList(roundId)
            .then(
                consignments => handleSuccess(consignments, callback),
                error => handleError(error, callback, 'Could not fetch the collections.'));

    } catch (e) {

        handleError(e, callback);
    }
};