'use strict';

const dropOffsApi = require('../../../lib/wrapper/dropOffs');
const {
          handleSuccess,
          handleError
      }           = require('aws-api-cognito');

exports.handler = (event, context, callback) => {

    try {

        let date      = event.requestContext.authorizer.date;
        let vehicleId = event.requestContext.authorizer.vehicleId;

        dropOffsApi
            .list(vehicleId, date)
            .then(
                dropOffs => handleSuccess(dropOffs, callback),
                error => handleError(error, callback, 'Could not fetch the drop offs.')
            );

    } catch (error) {

        handleError(error, callback);
    }

}
;