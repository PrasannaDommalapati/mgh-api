'use strict';

const uuid            = require('uuid');
const datastore       = require('aws-dynamo');
const {vehicleParams} = require('../aws');

const regex = {
    current:              {
        match: /^[A-Z]{2}[0-9]{2}[A-Z]{3}$/,
        parts: /^([A-Z]{2}[0-9]{2})([A-Z]{3})$/
    },
    prefix:               {
        match: /^[A-Z][0-9]{1,3}[A-Z]{3}$/,
        parts: /^([A-Z][0-9]{1,3})([A-Z]{3})$/
    }
    ,
    suffix:               {
        match: /^[A-Z]{3}[0-9]{1,3}[A-Z]$/,
        parts: /^([A-Z]{3})([0-9]{1,3}[A-Z])$/
    }
    ,
    datelessNumberSuffix: {
        match: /^[A-Z]{1,2,3}[0-9]{1,3,4}$/,
        parts: /^([A-Z]{1,2,3})([0-9]{1,3,4})$/
    }
    ,
    datelessNumberPrefix: {
        match: /^[0-9]{1,3,4}[A-Z]{1,2,3}$/,
        parts: /^([0-9]{1,3,4})([A-Z]{1,2,3})$/
    }
};

module.exports = {
    list:                           listVehicles,
    create:                         createVehicle,
    update:                         updateVehicle,
    get:                            getVehicle,
    delete:                         deleteVehicle,
    extract:                        extractData,
    getId:                          getId,
    standardiseVehicleRegistration: standardiseVehicleRegistration,
    cleanPinCode:                   cleanPinCode
};

function extractData(event) {

    return JSON.parse(event.body);
}

function getId(event) {

    return event.pathParameters.vehicleId;
}

function listVehicles(organisationId) {

    return new Promise((resolve, reject) => {

        try {

            const params = {
                KeyConditionExpression:    'organisationId = :organisationId',
                ExpressionAttributeValues: {':organisationId': organisationId}
            };

            Object.assign(params, vehicleParams);

            datastore.list(params, resolve, reject);

        } catch (error) {

            reject(new Error(error));
        }
    });
}

function getVehicle(organisationId, vehicleId) {

    return new Promise((resolve, reject) => {

        try {

            const params = {
                Key: {
                    organisationId: organisationId,
                    vehicleId:      vehicleId
                }
            };

            Object.assign(params, vehicleParams);

            datastore.get(params, resolve, reject);

        } catch (error) {

            reject(new Error(error));
        }
    });
}

function createVehicle(organisationId, vehicle) {

    return new Promise((resolve, reject) => {

        try {

            standardiseVehicleRegistration(vehicle);
            cleanPinCode(vehicle);

            const params = {
                Item: vehicle
            };

            params.Item.organisationId = organisationId;
            params.Item.vehicleId      = uuid();

            Object.assign(params, vehicleParams);

            datastore.create(params, resolve, reject);

        } catch (error) {

            reject(new Error(error));
        }
    });
}

function updateVehicle(organisationId, vehicleId, vehicle) {

    return new Promise((resolve, reject) => {

        try {

            delete vehicle.organisationId;
            delete vehicle.vehicleId;

            standardiseVehicleRegistration(vehicle);
            cleanPinCode(vehicle);

            let params = {
                Key: {
                    organisationId: organisationId,
                    vehicleId:      vehicleId
                }
            };

            datastore.addUpdateToParams(vehicle, params);

            Object.assign(params, vehicleParams);

            datastore.update(params, resolve, reject);

        } catch (error) {

            reject(new Error(error));
        }
    });
}

function deleteVehicle(organisationId, vehicleId) {

    return new Promise((resolve, reject) => {

        try {

            const params = {
                Key: {
                    organisationId: organisationId,
                    vehicleId:      vehicleId
                }
            };

            Object.assign(params, vehicleParams);

            datastore.delete(params, resolve, reject);

        } catch (error) {

            reject(new Error(error));
        }
    });
}

function standardiseVehicleRegistration(vehicle) {

    cleanVehicleRegistration(vehicle);

    if (!vehicle.hasOwnProperty('vehicleRegistration')) {
        return vehicle;
    }

    let vehicleRegistration = vehicle.vehicleRegistration;

    switch (true) {

        case (regex.current.match.test(vehicleRegistration)):

            vehicle.vehicleRegistration = getVehicleRegistration(vehicleRegistration, regex.current.parts);
            break;

        case (regex.prefix.match.test(vehicleRegistration)):

            vehicle.vehicleRegistration = getVehicleRegistration(vehicleRegistration, regex.prefix.parts);
            break;

        case (regex.suffix.match.test(vehicleRegistration)):

            vehicle.vehicleRegistration = getVehicleRegistration(vehicleRegistration, regex.suffix.parts);
            break;

        case (regex.datelessNumberPrefix.match.test(vehicleRegistration)):

            vehicle.vehicleRegistration = getVehicleRegistration(vehicleRegistration, regex.datelessNumberPrefix.parts);
            break;

        case (regex.datelessNumberSuffix.match.test(vehicleRegistration)):

            vehicle.vehicleRegistration = getVehicleRegistration(vehicleRegistration, regex.datelessNumberSuffix.parts);
            break;
    }

    return vehicle;
}

function getVehicleRegistration(vehicleRegistration, regex) {

    let parts = regex.exec(vehicleRegistration);

    return parts[1] + ' ' + parts[2];
}

function cleanVehicleRegistration(vehicle) {

    vehicle.hasOwnProperty('vehicleRegistration') && (vehicle.vehicleRegistration = vehicle.vehicleRegistration.replace(/[^\w]/gi, '').toUpperCase());

    return vehicle;
}

function cleanPinCode(vehicle) {

    vehicle.hasOwnProperty('pinCode') && (vehicle.pinCode = vehicle.pinCode.replace(/\D/g, ''));

    return vehicle;
}
