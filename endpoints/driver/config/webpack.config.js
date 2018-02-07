const login        = {
    'login':        './endpoints/login.js',
    'authenticate': './lib/authenticate.js'
};
const consignments = {
    'consignments-list': './endpoints/consignments/list.js'
};
const collections  = {
    'collections-list':   './endpoints/collections/list.js',
    'collections-update': './endpoints/collections/update.js'
};

const dropOffs = {
    'drop-offs-list':   './endpoints/drop-offs/list.js',
    'drop-offs-update': './endpoints/drop-offs/update.js'
};

module.exports = {
    entry:     Object.assign(login, consignments, collections, dropOffs),
    target:    'node',
    output:    {
        libraryTarget: 'commonjs',
        path:          '.webpack',
        filename:      '[name].js'
    },
    externals: [
        'aws-sdk',
        'uuid',
    ]
};