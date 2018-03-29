'use strict';

const user = require('../../../../lib/user');
const {
		  handleSuccess,
		  handleError,
		  getUserId
	  }    = require('@headforwards-spd/aws-lambda');

exports.handler = (event, context, callback) => {

    try {

        const userId = getUserId(event);

        user.getUserOrganisation(userId, ['organisationId'])
            .then(
                organisation => wasteFacilityApi.list(organisation.organisationId, event.resource),
                error => handleError(error, callback, 'Couldn\'t fetch the organisation id.')
            )
            .then(
                wasteFacilities => handleSuccess(wasteFacilities, callback),
                error => handleError(error, callback, 'Couldn\'t list the waste facilities.')
            );

    } catch (e) {

        handleError(e, callback);
    }
};
