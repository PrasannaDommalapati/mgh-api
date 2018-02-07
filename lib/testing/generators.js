const uuid         = require('uuid');
// const randomstring = require("randomstring");

module.exports = {
	uuid:   generateUuid,
	string: generateString,
};

function generateUuid() {

	return uuid();
}

function generateString() {

    let length  = 32,//Math.random() * 32,
        text    = '',
        charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIKLMNOPQRSTVXYZ0123456789';

    for (let i = 0; i < length; i++) {

        text += charset.charAt(Math.floor(Math.random() * charset.length));
	}

    return text;
}