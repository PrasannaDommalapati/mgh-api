'use strict';

const uuid = require('uuid');
const {organisationParams} = require('../aws');
const dynamo            = require('@headforwards-spd/aws-dynamo');

module.exports = {
    get: getOrganisation,
    create: createOrganisation,

};


function getOrganisation(organisationId) {

    return new Promise((resolve, reject) => {

        try {

            const params = {
                Key: {
                    organisationId: organisationId
                }
            };

            Object.assign(params, organisationParams);

            dynamo.get(params, resolve, reject);

        } catch (error) {

            reject(new Error(error));
        }
    });
}


function createOrganisation(organisation) {

    try {

        const params = {
            Item: organisation
        };

        params.Item.organisationId  = uuid();

        Object.assign(params, organisationParams);

        return (new Promise((resolve, reject) => dynamo.create(params, resolve, reject)));

    } catch (error) {

        return Promise.reject(error);
    }
}

function updateOrganisation(organisationId, wasteFacilityId, vehicle) {

    try {

        delete vehicle.organisationId;
        delete vehicle.wasteFacilityId;

        let params = {
            Key: {
                organisationId:  organisationId,
                wasteFacilityId: wasteFacilityId
            }
        };

        dynamo.addUpdateToParams(vehicle, params);

        Object.assign(params, organisationParams);

        return (new Promise((resolve, reject) => dynamo.update(params, resolve, reject)));

    } catch (error) {

        return Promise.reject(error);
    }
}

function deleteOrganisation(organisationId, wasteFacilityId) {

    try {

        const params = {
            Key: {
                organisationId:  organisationId,
                wasteFacilityId: wasteFacilityId
            }
        };

        Object.assign(params, organisationParams);

        return (new Promise((resolve, reject) => dynamo.delete(params, resolve, reject)));

    } catch (error) {

        return Promise.reject(error);
    }
}