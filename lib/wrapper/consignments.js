'use strict';

const wasteApi            = require('./waste');
const uuid                = require('uuid');
const datastore           = require('aws-dynamo');
const {consignmentParams} = require('../aws');

const listFilterExpression = {
    'created':   'attribute_not_exists(quoteRequestTimestamp)',
    'waiting':   'attribute_exists(quoteRequestTimestamp) and attribute_not_exists(quoteProvideTimestamp)',
    'quoted':    'attribute_exists(quoteProvideTimestamp) and attribute_not_exists(quoteAcceptTimestamp)',
    'completed': 'attribute_exists(quoteAcceptTimestamp)  and attribute_not_exists(collectionId) and attribute_not_exists(dropOffId)',
    'live':      'attribute_exists(collectionId)          and attribute_exists(dropOffId) and attribute_not_exists(completedTimestamp)',
    'closed':    'attribute_exists(completedTimestamp)'
};

module.exports = {
    allocate:                       allocate,
    updateDropOff:                  updateDropOff,
    list:                           listConsignments,
    driverList:                     driverListConsignments,
    create:                         createConsignment,
    update:                         updateConsignment,
    get:                            getConsignment,
    getConsignmentById:             getConsignmentById,
    delete:                         deleteConsignment,
    extract:                        extractConsignment,
    getId:                          getId,
    removeQuoteTimestamp:           removeQuoteTimestamp,
    setCollectedTimestamp:          setCollectedTimestamp,
    setDroppedOffTimestamp:         setDroppedOffTimestamp,
    setCollectionDeclinedTimestamp: setCollectionDeclinedTimestamp,
    setDropOffDeclinedTimestamp:    setDropOffDeclinedTimestamp
};

function allocate(quote, allocation) {

    return new Promise((resolve, reject) => {

        try {

            let update = {
                vehicleId: allocation.vehicleId,

                collectionRoundId: allocation.vehicleId + '.' + quote.collectionDate,
                collectionId:      allocation.collectionId,
                collectionDate:    quote.collectionDate,

                dropOffRoundId: allocation.vehicleId + '.' + allocation.dropOffDate,
                dropOffId:      allocation.dropOffId,
                dropOffDate:    allocation.dropOffDate,

                wasteFacilityId: allocation.wasteFacilityId
            };

            let params = {
                Key: {
                    brokerId:      quote.brokerId,
                    consignmentId: quote.consignmentId
                }
            };

            datastore.addUpdateToParams(update, params);

            Object.assign(params, consignmentParams);

            new Promise((resolve, reject) => datastore.update(params, resolve, reject))
                .then(
                    result => resolve(quote),
                    error => reject(new Error(error))
                );
        } catch (error) {

            reject(new Error(error));
        }
    });
}

function updateDropOff(quote, dropOff) {

    return new Promise((resolve, reject) => {

        try {

            let update = {

                dropOffRoundId: quote.vehicleId + '.' + dropOff.dropOffDate,

                dropOffDate:     dropOff.dropOffDate,
                wasteFacilityId: dropOff.wasteFacilityId
            };

            let params = {
                Key: {
                    brokerId:      quote.brokerId,
                    consignmentId: quote.consignmentId
                }
            };

            datastore.addUpdateToParams(update, params);

            Object.assign(params, consignmentParams);

            datastore.update(params, resolve, reject);

        } catch (error) {

            reject(new Error(error));
        }
    });

}

function extractConsignment(event) {

    return JSON.parse(event.body);
}

function getId(event) {

    return event.pathParameters.consignmentId;
}

function driverListConsignments(roundId) {

    return new Promise((resolve, reject) => {

        try {

            const projectionExpression = [
                'consignmentId',
                'description',
                'consignmentNoteCode',
                'wasteDescriptionProcess',
                'wasteDescriptionSic2007',
                'collectionId',
                'wasteRemovedFromAddress',
                'wasteProducerAddress',
                'collectedTimestamp',
                'collectionDeclinedTimestamp',
                'dropOffId',
                'WasteFacility',
                'droppedOffTimestamp',
                'dropOffDeclinedTimestamp',
                'completedTimestamp'
            ].join(', ');

            const collectionParams = {
                IndexName:                 'collectionRound-index',
                KeyConditionExpression:    'collectionRoundId = :roundId',
                ExpressionAttributeValues: {':roundId': roundId},
                ProjectionExpression:      projectionExpression
            };

            const dropOffParams = {
                IndexName:                 'dropOffRound-index',
                KeyConditionExpression:    'dropOffRoundId = :roundId',
                FilterExpression:          'collectionRoundId <> :roundId',
                ExpressionAttributeValues: {':roundId': roundId},
                ProjectionExpression:      projectionExpression
            };

            Object.assign(collectionParams, consignmentParams);
            Object.assign(dropOffParams, consignmentParams);

            return Promise.all([
                                   new Promise((resolve, reject) => datastore.list(collectionParams, resolve, reject)),
                                   new Promise((resolve, reject) => datastore.list(dropOffParams, resolve, reject))
                               ])
                          .then(
                              result => [].concat.apply([], result),
                              error => reject(new Error(error))
                          )
                          .then(
                              consignments => wasteApi.addWasteToConsignments(consignments),
                              error => reject(new Error(error))
                          )
                          .then(
                              consignments => resolve(indexById(consignments, 'consignmentId')),
                              error => reject(new Error(error))
                          );

        } catch (error) {

            reject(new Error(error));
        }
    });
}

function getConsignmentById(consignmentId) {

    return new Promise((resolve, reject) => {

        try {

            const params = {
                KeyConditionExpression:    'consignmentId = :consignmentId',
                ExpressionAttributeValues: {':consignmentId': consignmentId},
                IndexName:                 'consignment-index'
            };

            Object.assign(params, consignmentParams);

            datastore.getFirst(params, resolve, reject);

        } catch (error) {

            reject(new Error(error));
        }
    });
}

function listConsignments(brokerId, status) {

    return new Promise((resolve, reject) => {

        try {

            const params = {
                KeyConditionExpression:    'brokerId = :brokerId',
                ExpressionAttributeValues: {':brokerId': brokerId},
                FilterExpression:          listFilterExpression[status]
            };

            Object.assign(params, consignmentParams);

            datastore.list(params, resolve, reject);

        } catch (error) {

            reject(new Error(error));
        }
    });
}

function getConsignment(brokerId, consignmentId) {

    return new Promise((resolve, reject) => {

        try {

            const params = {
                Key: {
                    brokerId:      brokerId,
                    consignmentId: consignmentId
                }
            };

            Object.assign(params, consignmentParams);

            datastore.get(params, resolve, reject);

        } catch (error) {

            reject(new Error(error));
        }
    });

}

function createConsignment(brokerId, consignment) {

    return new Promise((resolve, reject) => {

        try {

            const params = {
                Item: consignment
            };

            params.Item.brokerId      = brokerId;
            params.Item.consignmentId = uuid();
            params.Item.Quotes        = {};

            Object.assign(params, consignmentParams);

            datastore.create(params, resolve, reject);

        } catch (error) {

            reject(new Error(error));
        }
    });
}

function updateConsignment(brokerId, consignmentId, consignment) {

    return new Promise((resolve, reject) => {

        try {

            delete consignment.brokerId;
            delete consignment.consignmentId;

            let params = {
                Key: {
                    brokerId:      brokerId,
                    consignmentId: consignmentId
                }
            };

            datastore.addUpdateToParams(consignment, params);

            Object.assign(params, consignmentParams);

            datastore.update(params, resolve, reject);

        } catch (error) {

            reject(new Error(error));
        }
    });
}

function deleteConsignment(consignment) {

    return new Promise((resolve, reject) => {

        try {

            const params = {
                Key:          {
                    brokerId:      consignment.brokerId,
                    consignmentId: consignment.consignmentId
                },
                ReturnValues: 'ALL_OLD'
            };

            Object.assign(params, consignmentParams);

            datastore.delete(params, resolve, reject);

        } catch (error) {

            reject(new Error(error));
        }
    });
}

function removeQuoteTimestamp(quote) {

    return new Promise((resolve, reject) => {

        try {

            let params = {
                Key:                      {
                    brokerId:      quote.brokerId,
                    consignmentId: quote.consignmentId
                },
                UpdateExpression:         'remove ' +
                                          'Quotes.#quoteId.provideTimestamp, ' +
                                          'quoteProvideTimestamp',
                ExpressionAttributeNames: {
                    '#quoteId': quote.quoteId
                }
            };

            Object.assign(params, consignmentParams);

            datastore.update(params, resolve, reject);

        } catch (error) {

            reject(new Error(error));
        }
    });
}

function setCollectedTimestamp(collection) {

    return new Promise((resolve, reject) => {

        try {

            getConsignmentKeyByCollection(collection)
                .then(
                    consignment => {

                        let brokerId      = consignment.brokerId,
                            consignmentId = consignment.consignmentId,
                            timestamp     = collection.collectedTimestamp,
                            update        = {
                                collectedTimestamp: timestamp
                            };

                        return updateConsignment(brokerId, consignmentId, update);
                    },
                    error => reject(new Error(error))
                )
                .then(
                    consignment => resolve(consignment),
                    error => reject(new Error(error))
                );

        } catch (error) {

            reject(new Error(error));
        }
    });
}

function setCollectionDeclinedTimestamp(collection) {

    return new Promise((resolve, reject) => {

        try {

            getConsignmentKeyByCollection(collection)
                .then(
                    consignment => {

                        let brokerId      = consignment.brokerId,
                            consignmentId = consignment.consignmentId,
                            timestamp     = collection.declinedTimestamp,
                            update        = {
                                collectionDeclinedTimestamp: timestamp,
                                completedTimestamp:          timestamp
                            };

                        return updateConsignment(brokerId, consignmentId, update);
                    },
                    error => reject(new Error(error))
                )
                .then(
                    consignment => resolve(consignment),
                    error => reject(new Error(error))
                );

        } catch (error) {

            reject(new Error(error));
        }
    });
}

function setDroppedOffTimestamp(dropOff) {

    return new Promise((resolve, reject) => {

        try {

            getConsignmentKeyByDropOff(dropOff)
                .then(
                    consignment => {

                        let brokerId      = consignment.brokerId,
                            consignmentId = consignment.consignmentId,
                            timestamp     = dropOff.droppedOffTimestamp,
                            update        = {
                                droppedOffTimestamp: timestamp,
                                completedTimestamp:  timestamp
                            };

                        return updateConsignment(brokerId, consignmentId, update);
                    },
                    error => reject(new Error(error))
                )
                .then(
                    consignment => resolve(consignment),
                    error => reject(new Error(error))
                );

        } catch (error) {

            reject(new Error(error));
        }
    });
}

function setDropOffDeclinedTimestamp(dropOff) {

    return new Promise((resolve, reject) => {

        try {

            getConsignmentKeyByDropOff(dropOff)
                .then(
                    consignment => {

                        let brokerId      = consignment.brokerId,
                            consignmentId = consignment.consignmentId,
                            timestamp     = dropOff.declinedTimestamp,
                            update        = {
                                dropOffDeclinedTimestamp: timestamp,
                                completedTimestamp:       timestamp
                            };

                        return updateConsignment(brokerId, consignmentId, update);
                    },
                    error => reject(new Error(error))
                )
                .then(
                    consignment => resolve(consignment),
                    error => reject(new Error(error))
                );

        } catch (error) {

            reject(new Error(error));
        }
    });
}

function getConsignmentKeyByCollection(collection) {

    return new Promise((resolve, reject) => {

        try {

            const params = {
                IndexName:                 'collectionRound-index',
                KeyConditionExpression:    'collectionRoundId = :roundId',
                FilterExpression:          'collectionId = :collectionId',
                ExpressionAttributeValues: {
                    ':roundId':      collection.roundId,
                    ':collectionId': collection.collectionId
                }
            };

            Object.assign(params, consignmentParams);

            datastore.getFirst(params, resolve, reject);

        } catch (error) {

            reject(new Error(error));
        }
    });
}

function getConsignmentKeyByDropOff(dropOff) {

    return new Promise((resolve, reject) => {

        try {

            const params = {
                IndexName:                 'dropOffRound-index',
                KeyConditionExpression:    'dropOffRoundId = :roundId',
                FilterExpression:          'dropOffId = :dropOffId',
                ExpressionAttributeValues: {
                    ':roundId':   dropOff.roundId,
                    ':dropOffId': dropOff.dropOffId
                }
            };

            Object.assign(params, consignmentParams);

            datastore.getFirst(params, resolve, reject);

        } catch (error) {

            reject(new Error(error));
        }
    });
}

function indexById(array, id) {

    return array.reduce((accumulator, item) => {

        let index          = item[id];
        accumulator[index] = item;
        return accumulator;
    }, {});
}