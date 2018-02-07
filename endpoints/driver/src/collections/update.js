'use strict';

const collectionApi = require('../../../lib/wrapper/collections');

const {
          handleSuccess,
          handleError,
          extractData
      } = require('aws-api-cognito');

exports.handler = (event, context, callback) => {

    try {

        let update = extractData(event);

        // check vehicle has access to collection
        // save the signatures
        // save signature ID's to the collection
        // update collectedDate of collection &&
        // update dropOff with collectedDate drop off has collectionId

        collectionApi
            .checkCollection(event)
            .then(
                collection => collectionApi.updateCollection(collection, update),
                error => handleError(error, callback, 'Invalid collection.')
            )
            .then(
                collection => handleSuccess(collection, callback),
                error => handleError(error, callback, 'Could not set collected timestamp.')
            );

    } catch (error) {

        handleError(error, callback);
    }
};