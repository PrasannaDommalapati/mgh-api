'use strict';

const api  = require('../../../../lib/wrapper/wasteFacility');
const user = require('../../../../lib/user');
const {
          handleSuccess,
          handleError,
          getUserId
      }    = require('@headforwards-spd/aws-lambda');

exports.handler = (event, context, callback) => {

    try {

        const wasteFacilityId = event.pathParameters.wasteFacilityId,
              userId          = getUserId(event);

        user.getUserOrganisation(userId, ['organisationId'])
            .then(
                organisation => api.delete(organisation.organisationId, wasteFacilityId),
                error => handleError(error, callback, 'Couldn\'t fetch the organisation id.')
            )
            .then(
                result => handleSuccess(wasteFacilityId, callback),
                error => handleError(error, callback, 'Couldn\'t delete the waste facility.')
            );

    } catch (e) {

        handleError(e, callback);
    }
};