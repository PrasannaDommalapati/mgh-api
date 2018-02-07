'use strict';

module.exports = (jwt, awsDynamo, vehicleApi) => new DriverApi(jwt, awsDynamo, vehicleApi);

function DriverApi(jwt, awsDynamo, vehicleApi) {

    return {
        getVehiclesFromLogin: getVehiclesFromLogin,
        addJwtToVehicles:     addJwtToVehicles,
        handleLogin:          handleLogin
    };

    function getVehiclesFromLogin(login) {

        return new Promise((resolve, reject) => {

            try {

                vehicleApi.standardiseVehicleRegistration(login);
                vehicleApi.cleanPinCode(login);

                const params = {
                    TableName:                 'vehicles',
                    IndexName:                 'vehicle-pin-index',
                    KeyConditionExpression:    'vehicleRegistration = :vehicleRegistration and pinCode = :pinCode',
                    ExpressionAttributeValues: {
                        ':vehicleRegistration': login.vehicleRegistration,
                        ':pinCode':             login.pinCode
                    },
                    ProjectionExpression:      ['vehicleId', 'vehicleRegistration', 'notes']
                };

                awsDynamo.list(params, resolve, reject);

            } catch (error) {

                reject(new Error(error));
            }
        });
    }

    function addJwtToVehicles(vehicles) {

        return vehicles.map(vehicle => addAuthToVehicle(vehicle));
    }

    function addAuthToVehicle(vehicle) {

        vehicle.jwt  = jwt.generateJwt(vehicle.vehicleId);
        vehicle.date = jwt.jwtToAuthToken(vehicle.jwt).date;

        return vehicle;
    }

    function handleLogin(vehicles, callback) {

        let statusCode = (!!vehicles.length) ? 200 : 401;

        let response = {
            statusCode: statusCode,
            headers:    {'Access-Control-Allow-Origin': '*'},
            body:       JSON.stringify(vehicles)
        };

        callback(null, response);
    }
}