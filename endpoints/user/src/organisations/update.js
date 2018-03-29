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

        const wasteFacilityId = api.getId(event),
              wasteFacility   = api.extract(event),
              userId          = getUserId(event);

        user.getUserOrganisation(userId, ['organisationId'])
            .then(
                organisation => api.update(organisation.organisationId, wasteFacilityId, wasteFacility),
                error => handleError(error, callback, 'Couldn\'t fetch the organisation id.')
            )
            .then(
                wasteFacility => handleSuccess(wasteFacility, callback),
                error => handleError(error, callback, 'Couldn\'t update the waste facility.')
            );

    } catch (e) {

        handleError(e, callback);
    }
};