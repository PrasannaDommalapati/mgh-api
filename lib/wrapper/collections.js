'use strict';

const dropOffApi       = require('./dropOffs');
const consignmentApi   = require('./consignments');
const quoteApi         = require('./quotes');
const signatureApi     = require('./signatures');
const vehicleApi       = require('./vehicles');
const wasteFacilityApi = require('./wasteFacility');

const uuid = require('uuid');

const { collectionParams } = require('../aws');
const datastore = require('aws-dynamo');

module.exports = {
    get:              getCollection,
    list:             list,
    save:             save,
    checkCollection:  checkCollection,
    updateCollection: updateCollection
};

function getCollection(quote, consignment) {

    return new Promise((resolve, reject) => {

            try {

                if (!consignment.collectionId || quote.quoteId !== consignment.jobId) {

                    return resolve(Object.assign(consignment, {Collection: null}));

                }

                let params = {
                    Key: {
                        carrierId:    quote.carrierId,
                        collectionId: consignment.collectionId
                    }
                };

                Object.assign(params, collectionParams);

                new Promise((resolve, reject) => datastore.get(params, resolve, reject))
                    .then(
                        collection => {

                            consignment.Collection                      = collection;
                            consignment.Collection.CollectionSignatures = {};

                            Promise.all([
                                            vehicleApi.get(quote.carrierId, consignment.Collection.vehicleId)
                                                      .then(
                                                          vehicle => consignment.Collection.Vehicle = vehicle,
                                                          error => reject(new Error(error))
                                                      ),
                                            signatureApi.get(consignment.Collection.carrierSignatureId)
                                                        .then(
                                                            signature => consignment.Collection.CollectionSignatures.CarrierSignature = signature,
                                                            error => reject(new Error(error))
                                                        ),
                                            signatureApi.get(consignment.Collection.consignorSignatureId)
                                                        .then(
                                                            signature => consignment.Collection.CollectionSignatures.ConsignorSignature = signature,
                                                            error => reject(new Error(error))
                                                        )
                                        ])
                                   .then(
                                       () => resolve(consignment),
                                       error => reject(new Error(error))
                                   );

                        },
                        error => reject(new Error(error))
                    );


            } catch (error) {

                reject(new Error(error));
            }
        }
    );
}

function list(vehicleId, collectionDate) {

    return new Promise(
        (resolve, reject) => {

            try {
                const params = {
                    IndexName:                 'round-index',
                    KeyConditionExpression:    'roundId = :roundId',
                    ExpressionAttributeValues: {':roundId': vehicleId + '.' + collectionDate}
                };

                Object.assign(params, collectionParams);

                new Promise((resolve, reject) => datastore.list(params, resolve, reject))
                    .then(
                        collections => wasteFacilityApi.addToCollections(collections),
                        error => reject(new Error(error))
                    )
                    .then(
                        collections => resolve(collections),
                        error => reject(new Error(error))
                    );
            } catch (error) {

                reject(new Error(error));
            }
        }
    );
}

function save(quote, allocation) {

    if (!allocation.hasOwnProperty('collectionId')) {

        return create(quote, allocation);
    }

    return new Promise((resolve, reject) => {

        try {
            consignmentApi
                .get(quote.brokerId, quote.consignmentId)
                .then(
                    consignment => {

                        let update = {
                            vehicleId:      allocation.vehicleId,
                            collectionDate: quote.collectionDate,
                            roundId:        allocation.vehicleId + '.' + quote.collectionDate
                        };

                        let params = {
                            Key: {
                                carrierId:    quote.carrierId,
                                collectionId: consignment.collectionId
                            }
                        };

                        datastore.addUpdateToParams(update, params);

                        Object.assign(params, collectionParams);

                        new Promise((resolve, reject) => datastore.update(params, resolve, reject))
                            .then(
                                result => resolve(quote),
                                error => reject(new Error(error))
                            );
                    },
                    error => resolve(error)
                );

        } catch (error) {

            reject(new Error(error));
        }
    });
}

function create(quote, allocation) {

    return new Promise(
        (resolve, reject) => {

            try {

                const params = {
                    Item: {
                        carrierId:      quote.carrierId,
                        collectionId:   uuid(),
                        consignmentId:  quote.consignmentId,
                        quoteId:        quote.quoteId,
                        vehicleId:      allocation.vehicleId,
                        collectionDate: quote.collectionDate,
                        roundId:        allocation.vehicleId + '.' + quote.collectionDate
                    }
                };

                allocation.collectionId = params.Item.collectionId;

                Object.assign(params, collectionParams);

                new Promise((resolve, reject) => datastore.create(params, resolve, reject))
                    .then(
                        result => resolve(quote),
                        error => reject(new Error(error))
                    );

            } catch (error) {

                reject(new Error(error));
            }
        }
    );
}

function checkCollection(event) {

    return new Promise(
        (resolve, reject) => {

            let collectionId   = event.pathParameters.collectionId,
                vehicleId      = event.requestContext.authorizer.vehicleId,
                collectionDate = event.requestContext.authorizer.date;

            try {

                let params = {
                    IndexName:                 'round-index',
                    KeyConditionExpression:    '#roundId = :roundId',
                    FilterExpression:          '#collectionId = :collectionId',
                    ExpressionAttributeNames:  {
                        '#roundId':      'roundId',
                        '#collectionId': 'collectionId'
                    },
                    ExpressionAttributeValues: {
                        ':roundId':      vehicleId + '.' + collectionDate,
                        ':collectionId': collectionId
                    }
                };

                Object.assign(params, collectionParams);

                new Promise((resolve, reject) => datastore.getFirst(params, resolve, reject))
                    .then(
                        collection => !!collection && resolve(collection) || reject(),
                        error => reject(new Error(error))
                    );

            } catch (error) {

                reject(new Error(error));
            }
        }
    );
}

function updateCollection(collection, update) {

    // switch from sign to decline
    if (!update.decline) {

        return saveCollectionSignatures(collection, update);

    } else {

        return saveCollectionDecline(collection, update);
    }
}

function saveCollectionDecline(collection, update) {

    // update the collection
    //update the consignment
    //update the quote
    return new Promise((resolve, reject) => {

        try {

            let collectionUpdate = {
                declinedTimestamp: Date.now(),
                decline:           update.decline

            };

            setCollection(collection, collectionUpdate)
                .then(
                    collection => setDeclinedTimestamp(collection),
                    error => reject(new Error(error))
                )
                .then(
                    collection => resolve(collection),
                    error => reject(new Error(error))
                );
        } catch (error) {

            reject(new Error(error));
        }
    });
}

function saveCollectionSignatures(collection, update) {

    // save carrier signature - stash the id into collection
    // save consignor signature - stash the id into the collection
    // resolve the updated collection

    return new Promise(
        (resolve, reject) => {

            try {

                Promise
                    .all(
                        [
                            signatureApi.save(update.CarrierSignature)
                                .then(
                                    signature => {
                                        collection.carrierSignatureId = signature.signatureId;
                                    }
                                ),
                            signatureApi.save(update.ConsignorSignature)
                                .then(
                                    signature => {
                                        collection.consignorSignatureId = signature.signatureId;
                                    }
                                )
                        ]
                    )
                    .then(
                        () => {

                            let update = {
                                collectedTimestamp:   Date.now(),
                                carrierSignatureId:   collection.carrierSignatureId,
                                consignorSignatureId: collection.consignorSignatureId
                            };

                            return setCollection(collection, update);
                        },
                        error => reject(new Error(error))
                    )
                    .then(
                        collection => setCollectedTimestamp(collection),
                        error => reject(new Error(error))
                    )
                    .then(
                        collection => resolve(collection),
                        error => reject(new Error(error))
                    );
            } catch (error) {

                reject(new Error(error));
            }

        }
    );
}

function setCollectedTimestamp(collection) {

    return new Promise(
        (resolve, reject) => {

            try {

                consignmentApi.setCollectedTimestamp(collection)
                    .then(
                        consignment => quoteApi.setCollectedTimestamp(collection, consignment),
                        error => reject(new Error(error))
                    )
                    .then(
                        consignment => dropOffApi.setCollectedTimestamp(collection, consignment),
                        error => reject(new Error(error))
                    )
                    .then(
                        () => resolve(collection),
                        error => reject(new Error(error))
                    );

            } catch (error) {

                reject(new Error(error));
            }
        }
    );
}

function setDeclinedTimestamp(collection) {

    return new Promise(
        (resolve, reject) => {

            try {

                consignmentApi.setCollectionDeclinedTimestamp(collection)
                    .then(
                        consignment => quoteApi.setCollectionDeclinedTimestamp(collection, consignment),
                        error => reject(new Error(error))
                    )
                    .then(
                        consignment => dropOffApi.setCollectionDeclinedTimestamp(collection, consignment),
                        error => reject(new Error(error))
                    )
                    .then(
                        () => resolve(collection),
                        error => reject(new Error(error))
                    );

            } catch (error) {

                reject(new Error(error));
            }
        }
    );
}

function setCollection(collection, update) {

    return new Promise(
        (resolve, reject) => {

            try {
                let params = {
                    Key: {
                        carrierId:    collection.carrierId,
                        collectionId: collection.collectionId
                    }
                };

                datastore.addUpdateToParams(update, params);

                Object.assign(params, collectionParams);

                datastore.update(params, resolve, reject);

            } catch (error) {

                reject(new Error(error));
            }
        }
    );
}