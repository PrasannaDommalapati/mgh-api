'use strict';

const uuid = require('uuid');

const wasteFacilityApi = require('./wasteFacility');
const consignmentApi   = require('./consignments');
const quoteApi         = require('./quotes');
const signatureApi     = require('./signatures');
const vehicleApi       = require('./vehicles');
const datastore       = require('aws-dynamo');

const {
          dropOffParams,
      } = require('../aws');

module.exports = {

    get:          getDropOff,
    save:         save,
    update:       update,
    list:         list,
    checkDropOff: checkDropOff,

    updateDropOff: updateDropOff,

    setCollectedTimestamp:          setCollectedTimestamp,
    setCollectionDeclinedTimestamp: setCollectionDeclinedTimestamp
};

function updateDropOff(dropOff, update) {

    if (!update.decline) {

        return saveDropOffSignature(dropOff, update);

    } else {

        return saveDropOffDecline(dropOff, update);
    }
}

function getDropOff(quote, consignment) {

    return new Promise(
        (resolve, reject) => {

            try {

                if (!consignment.dropOffId || quote.quoteId !== consignment.jobId) {

                    return resolve(Object.assign(consignment, {DropOff: null}));

                }

                let params = {
                    Key: {
                        carrierId: quote.carrierId,
                        dropOffId: consignment.dropOffId
                    }
                };

                Object.assign(params, dropOffParams);

                new Promise((resolve, reject) => datastore.get(params, resolve, reject))
                    .then(
                        dropOff => {

                            consignment.DropOff                   = dropOff;
                            consignment.DropOff.DropOffSignatures = {};

                            Promise.all([
                                            vehicleApi.get(quote.carrierId, consignment.DropOff.vehicleId)
                                                      .then(
                                                          vehicle => consignment.DropOff.Vehicle = vehicle,
                                                          error => reject(new Error(error))
                                                      ),
                                            signatureApi.get(consignment.DropOff.consigneeSignatureId)
                                                        .then(
                                                            signature => consignment.DropOff.DropOffSignatures.ConsigneeSignature = signature,
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

function list(vehicleId, dropOffDate) {

    return new Promise((resolve, reject) => {

        try {
            const params = {
                IndexName:                 'round-index',
                KeyConditionExpression:    'roundId = :roundId',
                ExpressionAttributeValues: {':roundId': vehicleId + '.' + dropOffDate}
            };

            Object.assign(params, dropOffParams);

            new Promise((resolve, reject) => datastore.list(params, resolve, reject))
                .then(
                    dropOffs => wasteFacilityApi.addToDropOffs(dropOffs),
                    error => reject(new Error(error))
                )
                .then(
                    dropOffs => resolve(dropOffs),
                    error => reject(new Error(error))
                );

        } catch (error) {

            reject(new Error(error));
        }
    });
}

function save(quote, allocation) {

    if (!allocation.hasOwnProperty('dropOffId')) {

        return create(quote, allocation);
    }

    return new Promise((resolve, reject) => {

        try {
            consignmentApi
                .get(quote.brokerId, quote.consignmentId)
                .then(
                    consignment => {

                        let update = {
                            wasteFacilityId: allocation.wasteFacilityId,
                            dropOffDate:     quote.dropOffDate,
                            vehicleId:       allocation.vehicleId,
                            roundId:         allocation.vehicleId + '.' + quote.dropOffDate
                        };

                        let params = {
                            Key: {
                                carrierId: quote.carrierId,
                                dropOffId: consignment.dropOffId
                            }
                        };

                        datastore.addUpdateToParams(update, params);

                        Object.assign(params, dropOffParams);

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

    return new Promise((resolve, reject) => {

        try {

            const params = {
                Item: {
                    carrierId:       quote.carrierId,
                    dropOffId:       uuid(),
                    consignmentId:   quote.consignmentId,
                    quoteId:         quote.quoteId,
                    vehicleId:       allocation.vehicleId,
                    wasteFacilityId: allocation.wasteFacilityId,
                    dropOffDate:     allocation.dropOffDate,
                    roundId:         allocation.vehicleId + '.' + allocation.dropOffDate
                }
            };

            allocation.dropOffId = params.Item.dropOffId;

            Object.assign(params, dropOffParams);

            new Promise((resolve, reject) => datastore.create(params, resolve, reject))
                .then(
                    result => resolve(quote),
                    error => reject(new Error(error))
                );

        } catch (error) {

            reject(new Error(error));
        }
    });
}

function update(quote, dropOff) {

    return new Promise((resolve, reject) => {

        try {

            let update = {
                roundId:         quote.vehicleId + '.' + dropOff.dropOffDate,
                dropOffDate:     dropOff.dropOffDate,
                wasteFacilityId: dropOff.wasteFacilityId
            };

            let params = {
                Key: {
                    carrierId: quote.carrierId,
                    dropOffId: quote.dropOffId
                }
            };

            datastore.addUpdateToParams(update, params);

            Object.assign(params, dropOffParams);

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

function checkDropOff(event) {

    return new Promise(
        (resolve, reject) => {

            let dropOffId   = event.pathParameters.dropOffId,
                vehicleId   = event.requestContext.authorizer.vehicleId,
                dropOffDate = event.requestContext.authorizer.date;

            try {

                let params = {
                    IndexName:                 'round-index',
                    KeyConditionExpression:    '#roundId = :roundId',
                    FilterExpression:          '#dropOffId = :dropOffId',
                    ExpressionAttributeNames:  {
                        '#roundId':   'roundId',
                        '#dropOffId': 'dropOffId'
                    },
                    ExpressionAttributeValues: {
                        ':roundId':   vehicleId + '.' + dropOffDate,
                        ':dropOffId': dropOffId
                    }
                };

                Object.assign(params, dropOffParams);

                new Promise((resolve, reject) => datastore.getFirst(params, resolve, reject))
                    .then(
                        dropOff => !!dropOff && resolve(dropOff) || reject(),
                        error => reject(new Error(error))
                    );

            } catch (error) {

                reject(new Error(error));
            }
        });
}

function saveDropOffSignature(dropOff, update) {

    return new Promise((resolve, reject) => {

        try {
            Promise
                .all(
                    [
                        signatureApi.save(update.ConsigneeSignature)
                            .then(
                                signature => {
                                    dropOff.consigneeSignatureId = signature.signatureId;
                                })
                    ])
                .then(
                    () => setDropOff(dropOff),
                    error => reject(new Error(error))
                )
                .then(
                    dropOff => setDroppedOffTimestamp(dropOff),
                    error => reject(new Error(error))
                )
                .then(
                    dropOff => resolve(dropOff),
                    error => reject(new Error(error))
                );

        } catch (error) {

            reject(new Error(error));
        }

    });
}

function saveDropOffDecline(dropOff, update) {

    // update the DropOff
    //update the consignment
    //update the quote
    return new Promise((resolve, reject) => {

        try {

            let carrierId     = dropOff.carrierId,
                dropOffId     = dropOff.dropOffId,
                dropOffUpdate = {
                    declinedTimestamp: Date.now(),
                    decline:           update.decline

                };

            saveDropOff(carrierId, dropOffId, dropOffUpdate)
                .then(
                    dropOff => setDeclinedTimestamp(dropOff),
                    error => reject(new Error(error)))
                .then(
                    dropOff => resolve(dropOff),
                    error => reject(new Error(error))
                );

        } catch (error) {

            reject(new Error(error));
        }
    });

}

function setCollectedTimestamp(collection, consignment) {

    return new Promise((resolve, reject) => {

        try {

            let carrierId     = collection.carrierId,
                dropOffId     = consignment.dropOffId,
                dropOffUpdate = {
                    collectedTimestamp: collection.collectedTimestamp
                };

            saveDropOff(carrierId, dropOffId, dropOffUpdate)
                .then(
                    result => resolve(consignment),
                    error => reject(new Error(error))
                );

        } catch (error) {

            reject(new Error(error));
        }
    });
}

function setCollectionDeclinedTimestamp(collection, consignment) {

    return new Promise((resolve, reject) => {

        try {

            let carrierId     = collection.carrierId,
                dropOffId     = consignment.dropOffId,
                dropOffUpdate = {
                    collectionDeclinedTimestamp: collection.declinedTimestamp
                };

            saveDropOff(carrierId, dropOffId, dropOffUpdate)
                .then(
                    result => resolve(consignment),
                    error => reject(new Error(error))
                );

        } catch (error) {

            reject(new Error(error));
        }
    });
}

function saveDropOff(carrierId, dropOffId, update) {

    return new Promise((resolve, reject) => {

        try {

            let params = {
                Key: {
                    carrierId: carrierId,
                    dropOffId: dropOffId
                }
            };

            datastore.addUpdateToParams(update, params);

            Object.assign(params, dropOffParams);

            datastore.update(params, resolve, reject);

        } catch (error) {

            reject(new Error(error));
        }
    });
}

function setDroppedOffTimestamp(dropOff) {

    return new Promise((resolve, reject) => {

        try {

            consignmentApi.setDroppedOffTimestamp(dropOff)
                .then(
                    consignment => quoteApi.setDroppedOffTimestamp(dropOff, consignment),
                    error => reject(new Error(error))
                )
                .then(
                    () => resolve(dropOff),
                    error => reject(new Error(error))
                );

        } catch (error) {

            reject(new Error(error));
        }
    });
}

function setDeclinedTimestamp(dropOff) {

    return new Promise((resolve, reject) => {

        try {

            consignmentApi.setDropOffDeclinedTimestamp(dropOff)
                .then(
                    consignment => quoteApi.setDropOffDeclinedTimestamp(dropOff, consignment),
                    error => reject(new Error(error))
                )
                .then(
                    () => resolve(dropOff),
                    error => reject(new Error(error))
                );

        } catch (error) {

            reject(new Error(error));
        }
    });
}

function setDropOff(dropOff) {

    return new Promise((resolve, reject) => {

        try {

            let dropOffUpdate = {
                droppedOffTimestamp:  Date.now(),
                consigneeSignatureId: dropOff.consigneeSignatureId
            };

            let params = {
                Key: {
                    carrierId: dropOff.carrierId,
                    dropOffId: dropOff.dropOffId
                }
            };

            datastore.addUpdateToParams(dropOffUpdate, params);

            Object.assign(params, dropOffParams);

            datastore.update(params, resolve, reject);

        } catch (error) {

            reject(new Error(error));
        }
    });
}
