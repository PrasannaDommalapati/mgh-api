'use strict';

import awsApi from '../../../lib/aws-api';

export default class login {

    constructor(driverApi) {

        this.driverApi = driverApi;
    }

    handler(event, context, callback) {

        try {

            let login = awsApi.extractData(event);


            this.driverApi
                .getVehiclesFromLogin(login)
                .then(
                    vehicles => this.driverApi.addJwtToVehicles(vehicles),
                    error => awsApi.handleError(error, callback, 'Could not fetch vehicle.')
                )
                .then(
                    vehicles => this.driverApi.handleLogin(vehicles, callback),
                    error => awsApi.handleError(error, callback, 'Could not fetch auth token.')
                );
        } catch (error) {

            awsApi.handleError(error, callback);
        }
    }
}