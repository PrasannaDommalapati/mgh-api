'use strict';

const collectionsApi = require('../../../lib/wrapper/collections');

const {
          handleSuccess,
          handleError
      } = require('aws-api-cognito');

exports.handler = (event, context, callback) => {

    try {

        let date      = event.requestContext.authorizer.date;
        let vehicleId = event.requestContext.authorizer.vehicleId;

        collectionsApi
            .list(vehicleId, date)
            .then(
                collections => handleSuccess(collections, callback),
                error => handleError(error, callback, 'Could not fetch the collections.')
            );

    } catch (error) {

        handleError(error, callback);
    }

};