'use strict';

const consignmentApi = require('./consignments');
const carrierApi     = require('./carriers');
const datastore      = require('aws-dynamo');

const {
          consignmentParams,
          quoteParams
      } = require('../aws');

const listFilterExpression = {

    requested: 'attribute_not_exists(provideTimestamp)',
    provided:  'attribute_exists(provideTimestamp)   and attribute_not_exists(acceptTimestamp)',
    accepted:  'attribute_exists(acceptTimestamp)    and attribute_not_exists(allocateTimestamp)',
    live:      'attribute_exists(allocateTimestamp)  and attribute_not_exists(completedTimestamp)',
    closed:    'attribute_exists(completedTimestamp)'
};

module.exports = {

    list:                    list,
    get:                     getCarrierQuote,
    getQuoteByConsignmentId: getQuoteFromConsignmentId,
    request:                 requestQuote,
    provide:                 provideQuote,
    accept:                  acceptQuote,
    allocate:                allocateQuote,
    updateDropOff:           updateDropOff,
    delete:                  deleteQuote,
    deleteConsignmentQuotes: deleteConsignmentQuotes,

    addBrokerIdToQuote: addBrokerIdToQuote,
    appendJob:          appendJobToConsignment,

    addQuoteToConsignment:       addQuoteToConsignment,
    addAcceptQuoteToConsignment: addAcceptQuoteToConsignment,

    resetQuoteTimestamps: resetQuoteTimestamps,
    updateJobDescription: updateJobDescription,

    consignmentList: consignmentList,

    getConsignmentId: getConsignmentId,
    getQuoteId:       getQuoteId,

    checkConsignmentId:        checkConsignmentId,
    checkCarrierId:            checkCarrierId,
    checkQuoteBelongsToBroker: checkQuoteBelongsToBroker,

    setCollectedTimestamp:          setCollectedTimestamp,
    setDroppedOffTimestamp:         setDroppedOffTimestamp,
    setCollectionDeclinedTimestamp: setCollectionDeclinedTimestamp,
    setDropOffDeclinedTimestamp:    setDropOffDeclinedTimestamp

};

function updateQuote(quoteId, update) {

    return new Promise(
        (resolve, reject) => {

            try {

                let params = {
                    Key: {
                        quoteId: quoteId
                    }
                };

                datastore.addUpdateToParams(update, params);

                Object.assign(params, quoteParams);

                datastore.update(params, resolve, reject);

            } catch (error) {

                reject(new Error(error));
            }
        }
    );
}

function setCollectedTimestamp(collection, consignment) {

    return new Promise(
        (resolve, reject) => {

            try {

                let update = {
                    collectedTimestamp: collection.collectedTimestamp
                };

                updateQuote(consignment.jobId, update)
                    .then(
                        () => resolve(consignment),
                        error => reject(new Error(error))
                    );

            } catch (error) {

                reject(new Error(error));
            }
        }
    );
}

function setCollectionDeclinedTimestamp(collection, consignment) {

    return new Promise(
        (resolve, reject) => {

            try {

                let timestamp = collection.declinedTimestamp,
                    update    = {
                        collectionDeclinedTimestamp: timestamp,
                        completedTimestamp:          timestamp
                    };

                updateQuote(consignment.jobId, update)
                    .then(
                        () => resolve(consignment),
                        error => reject(new Error(error))
                    );

            } catch (error) {

                reject(new Error(error));
            }
        }
    );
}

function setDropOffDeclinedTimestamp(dropOff, consignment) {

    return new Promise(
        (resolve, reject) => {

            try {

                let timestamp = dropOff.declinedTimestamp,
                    update    = {
                        dropOffDeclinedTimestamp: timestamp,
                        completedTimestamp:       timestamp
                    };

                updateQuote(consignment.jobId, update)
                    .then(
                        () => resolve(consignment),
                        error => reject(new Error(error))
                    );

            } catch (error) {

                reject(new Error(error));
            }
        }
    );
}

function setDroppedOffTimestamp(dropOff, consignment) {

    return new Promise(
        (resolve, reject) => {

            try {

                let update = {
                    droppedOffTimestamp: dropOff.droppedOffTimestamp,
                    completedTimestamp:  dropOff.droppedOffTimestamp
                };

                updateQuote(consignment.jobId, update)
                    .then(
                        () => resolve(consignment),
                        error => reject(new Error(error))
                    );

            } catch (error) {

                reject(new Error(error));
            }
        }
    );
}

function getConsignmentId(event) {

    return event.pathParameters.consignmentId;
}

function getQuoteId(event) {

    return event.pathParameters.quoteId;
}

function consignmentList(brokerId, consignmentId) {

    return new Promise((resolve, reject) => {

        try {

            const params = {
                IndexName:                 'brokerId-consignmentId-index',
                KeyConditionExpression:    'brokerId = :brokerId and consignmentId = :consignmentId',
                ExpressionAttributeValues: {':brokerId': brokerId, ':consignmentId': consignmentId}
            };

            Object.assign(params, quoteParams);

            datastore.list(params, resolve, reject);

        } catch (error) {

            reject(new Error(error));
        }
    });
}

function list(carrierId, resource) {

    return new Promise((resolve, reject) => {

        try {

            let filter = resource.replace('/quotes/', '');

            const params = {
                IndexName:                 'carrierId-index',
                KeyConditionExpression:    'carrierId = :carrierId',
                ExpressionAttributeValues: {':carrierId': carrierId}
            };

            !!filter && (params.FilterExpression = listFilterExpression[filter]);

            Object.assign(params, quoteParams);

            datastore.list(params, resolve, reject);

        } catch (error) {

            reject(new Error(error));
        }
    });
}

function addBrokerIdToQuote(brokerId, quote) {

    quote.brokerId = brokerId;

    return new Promise(resolve => resolve(quote));
}

function requestQuote(quote) {

    return new Promise(
        (resolve, reject) => {

            try {

                const params = {
                    Item: quote
                };

                params.Item.Quotes           = {};
                params.Item.requestTimestamp = Date.now();

                Object.assign(params, quoteParams);

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

function appendJobToConsignment(consignment) {

    return new Promise((resolve, reject) => {

        try {

            if (!consignment.jobId) {

                return resolve(Object.assign(consignment, {Job: null}));

            }

            getBrokerQuotes(consignment.brokerId, consignment.jobId)
                .then(
                    jobs => jobs.shift(),
                    error => reject(new Error(error))
                )
                .then(
                    job => resolve(Object.assign(consignment, {Job: job})),
                    error => reject(new Error(error))
                );

        } catch (error) {

            reject(new Error(error));
        }
    });
}

function addQuoteToConsignment(quote) {

    return new Promise(
        (resolve, reject) => {

            try {

                let quoteId = quote.quoteId,
                    params  = {
                        Key:                       {
                            brokerId:      quote.brokerId,
                            consignmentId: quote.consignmentId
                        },
                        ExpressionAttributeNames:  {
                            '#quoteId': quoteId
                        },
                        ExpressionAttributeValues: {
                            ':quote': quote
                        }
                    };

                if (quote.provideTimestamp) {

                    provideQuoteToParams(params, quote);

                } else if (quote.requestTimestamp) {

                    requestQuoteToParams(params, quote);
                }

                Object.assign(params, consignmentParams);

                new Promise((resolve, reject) => datastore.update(params, resolve, reject))
                    .then(result => resolve(quote),
                          error => reject(new Error(error))
                    );

            } catch (error) {

                reject(new Error(error));
            }
        });
}

function requestQuoteToParams(params, quote) {

    params.UpdateExpression = 'set ' +
        'Quotes.#quoteId  = :quote, ' +
        'quoteRequestTimestamp = if_not_exists(quoteRequestTimestamp, :requestTimestamp)';

    params.ExpressionAttributeValues[':requestTimestamp'] = quote.requestTimestamp;
}

function provideQuoteToParams(params, quote) {

    params.UpdateExpression = 'set ' +
        'Quotes.#quoteId  = :quote, ' +
        'quoteProvideTimestamp = if_not_exists(quoteProvideTimestamp, :provideTimestamp)';

    params.ExpressionAttributeValues[':provideTimestamp'] = quote.provideTimestamp;
}

function deleteQuote(quoteId) {

    return new Promise((resolve, reject) => {

        try {

            const params = {
                Key: {
                    quoteId: quoteId
                }
            };

            Object.assign(params, quoteParams);

            datastore.delete(params, resolve, reject);

        } catch (error) {

            reject(new Error(error));
        }
    });
}

function deleteConsignmentQuotes(consignment) {

    return new Promise(
        (resolve, reject) => {

            try {

                let deletes = [];

                !!consignment.quoteId && deletes.push(deleteQuote(consignment.quoteId));

                !!consignment.Quotes && Object.keys(consignment.Quotes).forEach(
                    (key) => {

                        deletes.push(deleteQuote(consignment.Quotes[key].quoteId));
                    }
                );

                Promise.all(deletes).then(
                    () => resolve(consignment),
                    error => reject(new Error(error))
                );

            } catch (error) {

                reject(new Error(error));
            }
        });
}

function provideQuote(quoteId, oldQuote, newQuote) {

    return new Promise((resolve, reject) => {

        try {

            let timestamp = Date.now();

            let params = {
                Key:              {
                    quoteId: quoteId
                },
                UpdateExpression: 'set ' +
                                  'price             = :price, ' +
                                  'collectionDate    = :collectionDate, ' +
                                  'carrierNotes      = :carrierNotes, ' +
                                  'userId            = :userId, ' +
                                  'provideTimestamp  = :timestamp',

                ExpressionAttributeValues: {
                    ':price':          newQuote.price,
                    ':collectionDate': newQuote.collectionDate,
                    ':carrierNotes':   newQuote.carrierNotes,
                    ':userId':         newQuote.userId,
                    ':timestamp':      timestamp

                }
            };

            oldQuote.hasOwnProperty('provideTimestamp') && addHistoryToParams(params, oldQuote);

            Object.assign(params, quoteParams);

            datastore.update(params, resolve, reject);

        } catch (error) {

            reject(new Error(error));
        }
    });
}

function addHistoryToParams(params, oldQuote) {

    params.UpdateExpression += ', Quotes.#timestamp = :quote';

    params.ExpressionAttributeValues[':quote'] = {
        price:            oldQuote.price,
        collectionDate:   oldQuote.collectionDate,
        carrierNotes:     oldQuote.carrierNotes,
        userId:           oldQuote.userId,
        provideTimestamp: oldQuote.provideTimestamp
    };

    params.ExpressionAttributeNames = {'#timestamp': oldQuote.provideTimestamp};
}

function acceptQuote(quoteId) {

    return new Promise((resolve, reject) => {

        try {

            let params = {
                Key:                       {
                    quoteId: quoteId
                },
                UpdateExpression:          'set ' +
                                           'acceptTimestamp = :acceptTimestamp',
                ExpressionAttributeValues: {
                    ':acceptTimestamp': Date.now()
                }
            };

            Object.assign(params, quoteParams);

            datastore.update(params, resolve, reject);

        } catch (error) {

            reject(new Error(error));
        }
    });
}

function allocateQuote(quote, allocation) {

    return new Promise(
        (resolve, reject) => {

            try {

                let update = {
                    'allocateTimestamp': Date.now(),
                    'collectionDate':    allocation.collectionDate,
                    'dropOffDate':       allocation.dropOffDate
                };
                let params = {
                    Key: {
                        quoteId: quote.quoteId
                    }
                };

                datastore.addUpdateToParams(update, params);

                Object.assign(params, quoteParams);
                Object.assign(quote, update);

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

    return new Promise(
        (resolve, reject) => {

            try {

                let update = {
                    'roundId':         quote.vehicleId + '.' + dropOff.dropOffDate,
                    'dropOffDate':     dropOff.dropOffDate,
                    'wasteFacilityId': dropOff.wasteFacilityId
                };
                let params = {
                    Key: {
                        quoteId: quoteId
                    }
                };

                datastore.addUpdateToParams(update, params);

                Object.assign(params, quoteParams);

                datastore.update(params, resolve, reject);

            } catch (error) {

                reject(new Error(error));
            }
        });

}

function addAcceptQuoteToConsignment(quote) {

    return new Promise((resolve, reject) => {

        try {

            let params = {
                Key:                       {
                    brokerId:      quote.brokerId,
                    consignmentId: quote.consignmentId
                },
                UpdateExpression:          'set ' +
                                           'Quotes.#quoteId.acceptTimestamp = :acceptTimestamp, ' +
                                           'quoteAcceptTimestamp            = :acceptTimestamp, ' +
                                           'jobId                           = :jobId',
                ExpressionAttributeNames:  {
                    '#quoteId': quote.quoteId
                },
                ExpressionAttributeValues: {
                    ':acceptTimestamp': quote.acceptTimestamp,
                    ':jobId':           quote.quoteId
                }
            };

            Object.assign(params, consignmentParams);

            datastore.update(params, resolve, reject);

        } catch (error) {

            reject(new Error(error));
        }
    });
}

function getBrokerQuotes(brokerId, quoteId) {

    return new Promise((resolve, reject) => {

        try {
            const params = {
                IndexName:                 'quoteId-brokerId-index',
                KeyConditionExpression:    'quoteId = :quoteId and brokerId = :brokerId',
                ExpressionAttributeValues: {':quoteId': quoteId, ':brokerId': brokerId}
            };

            Object.assign(params, quoteParams);

            datastore.list(params, resolve, reject);

        } catch (error) {

            reject(new Error(error));
        }
    });
}

function getQuoteFromConsignmentId(carrierId, consignmentId) {

    return new Promise((resolve, reject) => {

        try {

            const params = {
                IndexName:                 'consignment-carrier-index',
                KeyConditionExpression:    'consignmentId = :consignmentId and carrierId = :carrierId',
                ExpressionAttributeValues: {':carrierId': carrierId, ':consignmentId': consignmentId}
            };

            Object.assign(params, quoteParams);

            datastore.getFirst(params, resolve, reject);

        } catch (error) {

            reject(new Error(error));
        }
    });
}

function getCarrierQuote(carrierId, quoteId, conditionExpression) {

    return new Promise(
        (resolve, reject) => {

            try {

                const params = {
                    IndexName:                 'quote-carrier-index',
                    KeyConditionExpression:    'quoteId = :quoteId and carrierId = :carrierId',
                    ExpressionAttributeValues: {':quoteId': quoteId, ':carrierId': carrierId}
                };

                !!conditionExpression && (params.ConditionExpression = conditionExpression);

                Object.assign(params, quoteParams);

                datastore.getFirst(params, resolve, reject);

            } catch (error) {

                reject(new Error(error));
            }
        });

}

function checkQuoteConsignmentId(carrierId, quoteId, consignmentId) {

    return new Promise(
        (resolve, reject) => {

            try {

                getCarrierQuote(carrierId, quoteId)
                    .then(
                        quote => {

                            try {

                                (quote.consignmentId === consignmentId) && resolve(quote) || reject();

                            } catch (e) {

                                reject(new Error(e));
                            }
                        },
                        error => reject(new Error(error))
                    );

            } catch (e) {

                reject(new Error(e));
            }

        });
}

function checkQuoteBelongsToBroker(brokerId, quoteId) {

    return new Promise(
        (resolve, reject) => {

            try {

                getBrokerQuotes(brokerId, quoteId)
                    .then(
                        quotes => {

                            try {

                                !!quotes.length && resolve() || reject();

                            } catch (e) {

                                reject(new Error(e));
                            }
                        },
                        error => reject(new Error(error))
                    );

            } catch (e) {

                reject(new Error(e));
            }
        });
}

function checkCarrierId(brokerId, quote) {

    return new Promise(
        (resolve, reject) => {

            try {

                if (brokerId === quote.carrierId) {

                    resolve(quote);

                } else {

                    carrierApi.get(brokerId, quote.carrierId)
                              .then(
                                  carrier => {

                                      try {

                                          !!carrier.carrierId && resolve(quote) || reject();

                                      } catch (e) {

                                          reject(new Error(e));
                                      }

                                  },
                                  error => reject(new Error(error))
                              );
                }

            } catch (e) {

                reject(new Error(e));
            }
        });
}

function updateJobDescription(consignment) {

    return new Promise((resolve, reject) => {

        try {

            pullTheQuotes(consignment)
                .then(
                    quotes => {

                        let updates = [];

                        quotes.forEach(quote => {

                            let QuoteUpdate = {
                                description: consignment.description
                            };

                            let params = {
                                Key: {
                                    quoteId: quote.quoteId
                                }
                            };

                            datastore.addUpdateToParams(QuoteUpdate, params);

                            Object.assign(params, quoteParams);

                            updates.push(new Promise((resolve, reject) => datastore.update(params, resolve, reject)));
                        });

                        Promise.all(updates).then(
                            () => resolve(consignment),
                            error => reject(new Error(error))
                        );
                    },
                    error => reject(new Error(error))
                );
        } catch (error) {

            reject(new Error(error));
        }
    });
}

function resetQuoteTimestamps(consignment) {

    return new Promise(
        (resolve, reject) => {

            try {

                // check for timestamp
                // move the quote into history if it exists
                // then remove the timestamp from the quote

                // remove the timestamp of each effected quote from the consignment.Quote

                pullTheQuotes(consignment)
                    .then(
                        quotes => {

                            let updates = [];

                            quotes.forEach(
                                quote => {

                                    if (quote.carrierId !== quote.brokerId) {

                                        let update = resetQuoteTimestamp(quote)
                                            .then(
                                                result => consignmentApi.removeQuoteTimestamp(quote),
                                                error => reject(new Error(error))
                                            );

                                        updates.push(update);
                                    }

                                }
                            );

                            Promise.all(updates).then(
                                () => resolve(consignment),
                                error => reject(new Error(error))
                            );
                        }
                    );

            } catch (error) {

                reject(new Error(error));
            }
        });
}

function resetQuoteTimestamp(quote) {

    return new Promise(
        (resolve, reject) => {

            try {

                if (quote.hasOwnProperty('provideTimestamp')) {

                    let params = {
                        Key:                       {
                            quoteId: quote.quoteId
                        },
                        UpdateExpression:          'remove provideTimestamp ' +
                                                   'set Quotes.#provideTimestamp = :quote',
                        ExpressionAttributeNames:  {
                            '#provideTimestamp': quote.provideTimestamp
                        },
                        ExpressionAttributeValues: {
                            ':quote': {
                                price:            quote.price,
                                collectionDate:   quote.collectionDate,
                                carrierNotes:     quote.carrierNotes,
                                userId:           quote.userId,
                                provideTimestamp: quote.provideTimestamp
                            }
                        }
                    };

                    Object.assign(params, quoteParams);

                    new Promise((resolve, reject) => datastore.update(params, resolve, reject))
                        .then(
                            () => resolve(quote),
                            error => reject(new Error(error))
                        );

                } else {

                    resolve(quote);
                }

            } catch (error) {

                reject(new Error(error));
            }
        });
}

function pullTheQuotes(consignment) {

    return new Promise(
        (resolve, reject) => {

            try {

                let brokerId      = consignment.brokerId;
                let consignmentId = consignment.consignmentId;

                const params = {
                    IndexName:                 'brokerId-consignmentId-index',
                    KeyConditionExpression:    'brokerId = :brokerId and consignmentId = :consignmentId',
                    ExpressionAttributeValues: {':brokerId': brokerId, ':consignmentId': consignmentId},
                    ConditionExpression:       'attribute_exists(provideTimestamp)'
                };

                Object.assign(params, quoteParams);

                datastore.list(params, resolve, reject);

            } catch (error) {

                reject(new Error(error));
            }

        });
}

function checkConsignmentId(quote) {

    return consignmentApi.checkConsignmentId(quote.brokerId, quote.consignmentId);
}
