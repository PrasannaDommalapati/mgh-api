'use strict';

const { userOrganisationParams } = require('./aws');
const dynamo            = require('@headforwards-spd/aws-dynamo');

module.exports = {
    getUserOrganisation: getUserOrganisation
};

function getUserOrganisation(userId, attributes) {

    return new Promise((resolve, reject) => {

        try {

            let params = {
                Key:             {userId: userId},
                AttributesToGet: attributes
            };

            Object.assign(params, userOrganisationParams);

            new Promise((resolve, reject) => dynamo.get(params, resolve, reject))
                .then(
                    organisation => !!organisation && resolve(organisation) || reject(new Error('No Organisation found.')),
                    error => reject(new Error(error))
                );

        } catch (error) {

            reject(new Error(error));
        }
    });
}