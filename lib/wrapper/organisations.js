'use strict';

const {organisationParams} = require('../aws');
const datastore            = require('aws-dynamo');

module.exports = {
    addCarrierToConsignment: addCarrierToConsignment
};

function addCarrierToConsignment(consignment) {

    return new Promise((resolve, reject) => {

        try {

            if (!consignment.Job) {

                consignment.Carrier = null;
                resolve(consignment);
            } else {

                getOrganisation(consignment.Job.carrierId).then(
                    Organisation => {

                        consignment.Carrier = Organisation;

                        resolve(consignment);
                    },
                    error => reject(new Error(error))
                );
            }

        } catch (error) {

            reject(new Error(error));
        }
    });

}

function getOrganisation(organisationId) {

    return new Promise((resolve, reject) => {

        try {

            const params = {
                Key: {
                    organisationId: organisationId
                }
            };

            Object.assign(params, organisationParams);

            datastore.get(params, resolve, reject);

        } catch (error) {

            reject(new Error(error));
        }
    });
}
