'use strict';

const dropOffApi = require('../../../lib/wrapper/dropOffs');
const {
          handleSuccess,
          handleError,
          extractData
      }          = require('aws-api-cognito');

exports.handler = (event, context, callback) => {

    try {

        let update = extractData(event);

        dropOffApi
            .checkDropOff(event)
            .then(
                dropOff => dropOffApi.updateDropOff(dropOff, update),
                error => handleSuccess(error, callback, 'Invalid drop-off')
            )
            .then(
                dropOff => handleSuccess(dropOff, callback),
                error => handleError(error, callback, 'Could not set drop-off signatures.')
            );

    } catch (error) {

        handleError(error, callback);
    }
};