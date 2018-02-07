'use strict';

const dynamo = require('aws-dynamo');
const lambda = require('aws-api-cognito');

const jwt        = require('../lib/jwt');
const vehicleApi = require('../../lib/wrapper/vehicles');

const driverApi = require('../lib/api/drivers')(jwt, dynamo, vehicleApi);

exports.handler = (event, context, callback) => {

    try {

        let login = lambda.extractData(event);

        driverApi
            .getVehiclesFromLogin(login)
            .then(
                vehicles => driverApi.addJwtToVehicles(vehicles),
                error => lambda.handleError(error, callback, 'Could not fetch vehicle.')
            )
            .then(
                vehicles => driverApi.handleLogin(vehicles, callback),
                error => lambda.handleError(error, callback, 'Could not fetch auth token.')
            );
    } catch (error) {

        lambda.handleError(error, callback);
    }
};