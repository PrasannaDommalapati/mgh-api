'use strict';

const uuid                 = require('uuid');
const {organisationParams} = require('../aws');
const dynamo               = require('@headforwards-spd/aws-dynamo');

module.exports = {
    userGet: userOrganisation,
    create:  createOrganisation,
    get:     getOrganisation,
    list:    listOrganisations,
    update:  updateOrganisation,
    remove:  deleteOrganisation
};

function userOrganisation(organisationId) {

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

function getOrganisation(organisationId) {

    return new Promise((resolve, reject) => {

        try {

            const params = {
                KeyConditionExpression:    'organisationId = :organisationId',
                ExpressionAttributeValues: {':organisationId': organisationId}
            };

            Object.assign(params, organisationParams);

            dynamo.getFirst(params, resolve, reject);

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

        params.Item.organisationId = uuid();

        Object.assign(params, organisationParams);

        return (
            new Promise((resolve, reject) => dynamo.create(params, resolve, reject))
        );

    } catch (error) {

        return Promise.reject(error);
    }
}

function listOrganisations() {

    try {

        let params = Object.assign({}, organisationParams);

        return (
            new Promise((resolve, reject) => dynamo.scan(params, resolve, reject))
        );

    } catch (error) {

        return Promise.reject(error);
    }

}

function updateOrganisation(organisationId, organisation) {

    try {

        delete organisation.organisationId;

        let params = {
            Key: {
                organisationId: organisationId
            }
        };

        dynamo.addUpdateToParams(organisation, params);

        console.log(params);

        Object.assign(params, organisationParams);

        return (
            new Promise((resolve, reject) => dynamo.update(params, resolve, reject))
        );

    } catch (error) {

        return Promise.reject(error);
    }
}

function deleteOrganisation(organisationId) {

    try {

        const params = {
            Key: {
                organisationId:  organisationId,
            }
        };

        Object.assign(params, organisationParams);

        return (
            new Promise((resolve, reject) => dynamo.delete(params, resolve, reject))
        );

    } catch (error) {

        return Promise.reject(error);
    }
}