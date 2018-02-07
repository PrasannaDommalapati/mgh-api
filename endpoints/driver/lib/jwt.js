'use strict';
const crypto = require('crypto');
const env    = require('../../lib/env');

module.exports = {

    generateJwt:    generateJwt,
    jwtToAuthToken: jwtToAuthToken,
    authorised:     authorised
};

function generateJwt(vehicleId, date) {

    let authToken = {
        vehicleId: vehicleId,
        date:      (!!date) ? date : new Date().toISOString().slice(0, 10)
    };

    authToken.hash = hashAuthToken(authToken);

    return authTokenToJwt(authToken);
}

function jwtToAuthToken(jwt) {

    return JSON.parse(
        Buffer.from(jwt, 'base64').toString('ascii')
    );
}

function authTokenToJwt(authToken) {

    return Buffer.from(
        JSON.stringify(authToken),
        'ascii'
    ).toString('base64');
}

function authorised(requestJwt, vehicleId, date) {

    return requestJwt === generateJwt(vehicleId, date);
}

function hashAuthToken(authToken) {

    let authTokenString = authTokenToJwt(authToken);
    let hash            = crypto.createHmac('sha512', env.env.SALT);

    hash.update(authTokenString);

    return hash.digest('base64');
}