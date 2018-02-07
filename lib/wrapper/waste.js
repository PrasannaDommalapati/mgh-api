'use strict';
const uuid = require('uuid');
const datastore = require('aws-dynamo');
const { wasteParams }    = require('../aws');

module.exports = {
    getId:                  getId,
    appendList:             appendList,
    list:                   listWaste,
    get:                    getWaste,
    save:                   saveWaste,
    delete:                 deleteWaste,
    deleteConsignmentWaste: deleteConsignmentWaste,
    addWasteToConsignments: addWasteToConsignments
};

function getId(event) {

    try {

        const id = event.pathParameters.wasteId;

        return (!!id) ? id : uuid();

    } catch (e) {

        return uuid();
    }
}

function appendList(consignment) {

    return new Promise(
        (resolve, reject) => {

            try {

                listWaste(consignment.consignmentId)
                    .then(
                        waste => resolve(Object.assign(consignment, {Waste: waste})),
                        error => reject(new Error(error)))
            } catch (e) {

                reject(new Error(e));
            }
        }
    );
}

function listWaste(consignmentId) {

    return new Promise((resolve, reject) => {

        try {

            const params = {
                KeyConditionExpression:    'consignmentId = :consignmentId',
                ExpressionAttributeValues: {':consignmentId': consignmentId}
            };

            Object.assign(params, wasteParams);

            datastore.list(params, resolve, reject);

        } catch (error) {

            reject(new Error(error));
        }
    });
}

function getWaste(consignmentId, wasteId) {

    return new Promise((resolve, reject) => {

        try {

            const params = {
                Key: {
                    consignmentId: consignmentId,
                    wasteId:       wasteId
                }
            };

            Object.assign(params, wasteParams);

            datastore.get(params, resolve, reject);

        } catch (error) {

            reject(new Error(error));
        }
    });
}

function saveWaste(consignmentId, waste) {

    return new Promise((resolve, reject) => {

        try {

            const params = {
                Item: waste
            };

            params.Item.consignmentId = consignmentId;

            Object.assign(params, wasteParams);

            datastore.create(params, resolve, reject);

        } catch (error) {

            reject(new Error(error));
        }
    });
}

function deleteConsignmentWaste(consignment) {

    return new Promise((resolve, reject) => {

        try {

            let ConsignmentWasteDelete = [];

            listWaste(consignment.consignmentId)
                .then(waste => {

                    ConsignmentWasteDelete.push(deleteWaste(consignmentId, waste.wasteId));
                });

            Promise.all(ConsignmentWasteDelete).then(
                () => resolve(consignment),
                error => reject(new Error(error))
            );

        } catch (error) {

            reject(new Error(error));
        }
    });
}

function deleteWaste(consignmentId, wasteId) {

    return new Promise((resolve, reject) => {

        try {

            const params = {
                Key: {
                    consignmentId: consignmentId,
                    wasteId:       wasteId
                }
            };

            Object.assign(params, wasteParams);

            datastore.delete(params, resolve, reject);

        } catch (error) {

            reject(new Error(error));
        }
    });
}

function addWasteToConsignments(consignments) {

    let requests = consignments.map(consignment => addWasteToConsignment(consignment));

    return Promise.all(requests).then(() => {
        return consignments;
    });
}

function addWasteToConsignment(consignment) {

    let promise = listWaste(consignment.consignmentId);

    promise
        .then(result => {
            consignment['Waste'] = result;
            promise.resolve();
        });

    return promise;
}
