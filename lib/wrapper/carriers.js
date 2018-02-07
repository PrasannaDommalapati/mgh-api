const datastore = require('aws-dynamo');
const {
          carrierParams
      }         = require('../aws');

module.exports = {
    get:  getCarrier,
    list: listCarriers
};

function getCarrier(brokerId, carrierId) {

    return new Promise((resolve, reject) => {

        try {

            const params = {
                Key: {
                    brokerId:  brokerId,
                    carrierId: carrierId
                }
            };

            Object.assign(params, carrierParams);

            datastore.get(params, resolve, reject);

        } catch (error) {

            reject(new Error(error));
        }
    });
}

function listCarriers(organisationId) {

    return new Promise((resolve, reject) => {

        try {

            const params = {
                IndexName:                 'broker-index',
                KeyConditionExpression:    'brokerId = :brokerId',
                ExpressionAttributeValues: {':brokerId': organisationId}
            };

            Object.assign(params, carrierParams);

            datastore.list(params, resolve, reject);

        } catch (error) {

            reject(new Error(error));
        }
    });
}
