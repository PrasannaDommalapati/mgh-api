'use strict';
const jwt = require('./jwt');

exports.listHandler   = listHandler;
exports.updateHandler = updateHandler;

function listHandler(event, context, callback) {

    try {
        let arn        = extractArn(event);
        let requestJwt = extractJwt(event);
        let authToken  = jwt.jwtToAuthToken(requestJwt);

        let vehicleId = authToken.vehicleId;
        let date      = new Date().toISOString().slice(0, 10);

        let authorised = jwt.authorised(requestJwt, vehicleId, date);

        authorised && callback(null, generatePolicy(vehicleId, 'Allow', arn, authToken));
        !authorised && callback('Unauthorized');

    } catch (e) {

        callback(new Error(e));
    }
}

function updateHandler(event, context, callback) {

    try {
        let arn        = extractArn(event);
        let requestJwt = extractJwt(event);
        let authToken  = jwt.jwtToAuthToken(requestJwt);

        let vehicleId = authToken.vehicleId;
        let date      = authToken.date;

        let authorised = jwt.authorised(requestJwt, vehicleId, date);

        authorised && callback(null, generatePolicy(vehicleId, 'Allow', arn, authToken));
        !authorised && callback('Unauthorized');

    } catch (e) {

        callback(new Error(e));
    }
}

function extractArn(event) {

    return /^(.*\/(?:GET|PUT)\/)(:?.*)$/.exec(event.methodArn)[1] + '*';
}

function extractJwt(event) {

    return event.authorizationToken;
}

function generatePolicy(principalId, effect, resource, authToken) {

    let authResponse = {};

    authResponse.principalId = principalId;
    if (effect && resource) {

        let policyDocument       = {};
        policyDocument.Version   = '2012-10-17'; // default version
        policyDocument.Statement = [];

        let statementOne            = {};
        statementOne.Action         = 'execute-api:Invoke'; // default action
        statementOne.Effect         = effect;
        statementOne.Resource       = resource;
        policyDocument.Statement[0] = statementOne;
        authResponse.policyDocument = policyDocument;
    }

    authResponse.context = authToken;

    return authResponse;
}
