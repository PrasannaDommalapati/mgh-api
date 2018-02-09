'use strict';

const {organisationParams} = require('../aws');
const dynamo            = require('@headforwards-spd/aws-dynamo');

module.exports = {
    get: getOrganisation
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
