'use strict';

const uuid = require('uuid');

const consignmentApi = require('./consignments');
const datastore      = require('aws-dynamo');

const {
          wasteFacilityParams
      } = require('../aws');

module.exports = {
    list:             listWasteFacilities,
    create:           createWasteFacility,
    update:           updateWasteFacility,
    get:              getWasteFacility,
    delete:           deleteWasteFacility,
    extract:          extractWasteFacility,
    getId:            getId,
    addToConsignment: addToConsignment,
    addToCollections: addToCollections,
    addToDropOffs:    addToDropOffs
};

function extractWasteFacility(event) {

    return JSON.parse(event.body);
}

function getId(event) {

    return event.pathParameters.wasteFacilityId;
}

function addToConsignment(consignment) {

    return new Promise((resolve, reject) => {

        try {

            if (!consignment.wasteFacilityId || !consignment.jobId) {

                return resolve(Object.assign(consignment, {WasteFacility: null}));

            }

            getWasteFacility(
                consignment.Quotes[consignment.jobId].carrierId,
                consignment.wasteFacilityId
            ).then(
                WasteFacility => resolve(Object.assign(consignment, {WasteFacility: WasteFacility})),
                error => reject(new Error(error))
            );


        } catch (error) {

            reject(new Error(error));
        }
    });

}

function addToCollections(collections) {

    return new Promise((resolve, reject) => {

        try {

            let requests = collections.map(collection => addToCollection(collection));

            Promise.all(requests).then(
                () => resolve(collections),
                error => reject(new Error(error))
            );

        } catch (error) {

            reject(new Error(error));
        }
    });
}

function addToCollection(collection) {

    return new Promise((resolve, reject) => {

        try {

            consignmentApi.getConsignmentById(collection.consignmentId)
                          .then(
                              consignment => getWasteFacility(
                                  consignment.Quotes[consignment.jobId].carrierId,
                                  consignment.wasteFacilityId
                              ),
                              error => reject(new Error(error))
                          )
                          .then(wasteFacility => {

                                    collection['WasteFacility'] = wasteFacility;
                                    !!wasteFacility && resolve() || reject(new Error('Waste facility not found.'));
                                },
                                error => reject(new Error(error))
                          );
        } catch (error) {

            reject(new Error(error));
        }
    });
}

function addToDropOffs(dropOffs) {

    return new Promise((resolve, reject) => {

        try {

            let requests = dropOffs.map(dropOff => addToDropOff(dropOff));

            Promise.all(requests).then(
                () => resolve(dropOffs),
                error => reject(new Error(error))
            );

        } catch (error) {

            reject(new Error(error));
        }
    });
}

function addToDropOff(dropOff) {

    return new Promise((resolve, reject) => {

        try {

            getWasteFacility(dropOff.carrierId, dropOff.wasteFacilityId)
                .then(wasteFacility => {

                          dropOff['WasteFacility'] = wasteFacility;
                          resolve();
                      },
                      error => reject(new Error(error))
                );
        }
        catch (error) {

            reject(new Error(error));
        }
    });
}

function listWasteFacilities(organisationId) {

    return new Promise((resolve, reject) => {

        try {

            const params = {
                KeyConditionExpression:    'organisationId = :organisationId',
                ExpressionAttributeValues: {':organisationId': organisationId}
            };

            Object.assign(params, wasteFacilityParams);

            datastore.list(params, resolve, reject);

        } catch (error) {

            reject(new Error(error));
        }
    });
}

function getWasteFacility(organisationId, wasteFacilityId) {

    return new Promise((resolve, reject) => {

        try {

            const params = {
                Key: {
                    organisationId:  organisationId,
                    wasteFacilityId: wasteFacilityId
                }
            };

            Object.assign(params, wasteFacilityParams);

            console.log('params to get the waste facility :: ', params);
            datastore.get(params, resolve, reject);

        } catch (error) {

            reject(new Error(error));
        }
    });
}

function createWasteFacility(organisationId, vehicle) {

    return new Promise((resolve, reject) => {

        try {

            const params = {
                Item: vehicle
            };

            params.Item.organisationId  = organisationId;
            params.Item.wasteFacilityId = uuid();

            Object.assign(params, wasteFacilityParams);

            datastore.create(params, resolve, reject);

        } catch (error) {

            reject(new Error(error));
        }
    });
}

function updateWasteFacility(organisationId, wasteFacilityId, vehicle) {

    return new Promise((resolve, reject) => {

        try {

            delete vehicle.organisationId;
            delete vehicle.wasteFacilityId;

            let params = {
                Key: {
                    organisationId:  organisationId,
                    wasteFacilityId: wasteFacilityId
                }
            };

            datastore.addUpdateToParams(vehicle, params);

            Object.assign(params, wasteFacilityParams);

            datastore.update(params, resolve, reject);

        } catch (error) {

            reject(new Error(error));
        }
    });
}

function deleteWasteFacility(organisationId, wasteFacilityId) {

    return new Promise((resolve, reject) => {

        try {

            const params = {
                Key: {
                    organisationId:  organisationId,
                    wasteFacilityId: wasteFacilityId
                }
            };

            Object.assign(params, wasteFacilityParams);

            datastore.delete(params, resolve, reject);

        } catch (error) {

            reject(new Error(error));
        }
    });
}