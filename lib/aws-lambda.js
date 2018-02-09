'use strict';

const uuid = require('uuid');

module.exports = {
    getUserId:        getUserId,
    checkUserGroup:   checkUserGroup,
    handleSuccess:    handleSuccess,
    handleError:      handleError,
    extractNew:       extractNew,
    extractData:      extractData,
    extractUserAgent: extractUserAgent,
    getPathParam:     getPathParam
};

function getUserId(event) {

    try {
        return event.requestContext.authorizer.claims.sub;

    } catch (error) {

        throw new Error(error);
    }
}

function checkUserGroup(event, group) {

    return new Promise((resolve, reject) => {

        try {

            let groups = event.requestContext.authorizer.claims['cognito:groups'].split(',');

            groups.indexOf(group) !== -1 && resolve() || reject();

        } catch (error) {

            reject(new Error(error));
        }
    });
}

function handleSuccess(data, callback) {

    let statusCode = (!!data) ? 200 : 404;

    let response = {
        statusCode: statusCode,
        headers:    {'Access-Control-Allow-Origin': '*'},
        body:       JSON.stringify(data)
    };

    callback(null, response);
}

function handleError(error, callback, message) {

    console.log('error', error);
    console.log('message', message);

    message = (message) ? new Error(message) : error;

    let response = {
        statusCode: 500,
        headers:    {'Access-Control-Allow-Origin': '*'},
        body:       message.toString()
    };

    callback(null, response);
}

function extractNew(event, idField) {

    let data = extractData(event);

    data[idField] = uuid();

    return data;
}

function extractData(event) {

    return JSON.parse(event.body);
}

function getPathParam(param, event) {

    return event.pathParameters[param];
}

function extractUserAgent(event) {

    return event.headers['User-Agent'];
}
