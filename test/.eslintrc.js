const jestPackage = require('jest/package.json');

module.exports = {
    settings: {
        jest: {
            version: jestPackage.version,
        },
    },
    extends: [
        'eslint:recommended',
        'plugin:jest/recommended',
        'plugin:@typescript-eslint/recommended',
    ],
    plugins: ['jest'],
    env: {
        'jest/globals': true
    },
    rules: {
        'jest/no-disabled-tests': 'warn',
        'jest/no-focused-tests': 'error',
        'jest/no-identical-title': 'error',
        'jest/prefer-to-have-length': 'warn',
        'jest/valid-expect': 'error',
        '@typescript-eslint/no-var-requires': 0,
    },
    ignorePatterns: ['dist', '**/generated'],
    overrides: [{
        files: ['./test/**/*.ts'],
        rules: {
            '@typescript-eslint/no-unused-expressions': 0
        }
    }],

};