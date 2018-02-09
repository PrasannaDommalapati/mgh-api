const cli = require('cli');

cli.parse({
              stage: [ 's', 'stage of environment', 'string', 'local'],
              region: [ 'p', 'package location folder', 'string', '.serverless-local' ]
          });

module.exports = {
    target:    'node',
    output:    {
        libraryTarget: 'commonjs',
        path:          '.webpack-' + cli.options.stage,
        filename:      '[name].js'
    },
    externals: [
        'aws-sdk',
        'uuid'
    ]
};
