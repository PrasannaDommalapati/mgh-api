'use strict';

const uuid = require('uuid');
const datastore = require('aws-dynamo');

const { signatureParams } = require('../aws');

module.exports.save = saveSignature;
module.exports.get  = getSignature;

function saveSignature(Signature) {

    return new Promise((resolve, reject) => {

        try {

            let params = {
                Item: {
                    signatureId: uuid(),
                    name:        Signature.name,
                    date:        Signature.date,
                    signature:   Signature.signature
                }
            };

            Object.assign(params, signatureParams);

            datastore.create(params, resolve, reject);

        } catch (error) {

            reject(new Error(error));
        }
    });
}

function getSignature(signatureId) {

    return new Promise((resolve, reject) => {

        try {

            if (!signatureId) {
                return resolve(null);
            }

            const params = {
                Key: {
                    signatureId: signatureId
                }
            };

            Object.assign(params, signatureParams);

            datastore.get(params, resolve, reject);

        } catch (error) {

            reject(new Error(error));
        }
    });
}