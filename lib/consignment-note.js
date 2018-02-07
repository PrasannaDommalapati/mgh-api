'use strict';

const consignmentApi   = require('./wrapper/consignments');
const collectionApi    = require('./wrapper/collections');
const dropOffApi       = require('./wrapper/dropOffs');
const organisationApi  = require('./wrapper/organisations');
const wasteApi         = require('./wrapper/waste');
const quotesApi        = require('./wrapper/quotes');
const WasteFacilityApi = require('./wrapper/wasteFacility');


module.exports.get = (brokerId, consignmentId) => {

    return new Promise((resolve, reject) => {

        try {

            consignmentApi
                .get(brokerId, consignmentId)
                .then(
                    // add the job
                    consignment => quotesApi.appendJob(consignment),
                    error => reject(new Error('Could not get the consignment.'))
                )
                // add the waste
                .then(
                    consignment => wasteApi.appendList(consignment),
                    error => reject(new Error(error + 'Could not get the job.'))
                )
                // add collection signatures
                .then(
                    consignment => collectionApi.get(consignment.Job, consignment),
                    error => reject(new Error('Could not get the waste.'))
                )
                // add drop off signatures
                .then(
                    consignment => dropOffApi.get(consignment.Job, consignment),
                    error => reject(new Error('Could not get the collections.'))
                )
                // add Waste Facility
                .then(
                    consignment => WasteFacilityApi.addToConsignment(consignment),
                    error => reject(new Error('Could not get the dropOffs.'))
                )
                // add Carrier (organisation)
                .then(
                    consignment => organisationApi.addCarrierToConsignment(consignment),
                    error => reject(new Error('Could not get the Waste Facility.'))
                )
                .then(
                    consignment => resolve(consignment),
                    error => reject(new Error(error))
                );

        } catch (error) {

            reject(new Error('something went horribly wrong.'))
        }

    });
};