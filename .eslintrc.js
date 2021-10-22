module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    plugins: [
        '@typescript-eslint',
        'no-floating-promise',
        'jest'
    ],
    extends: [
        'eslint:recommended',
        'plugin:jest/recommended',
        'plugin:@typescript-eslint/recommended',
    ],
    env: {
        'node': true,
        'jest/globals': true,
    },
    rules: {
        '@typescript-eslint/no-var-requires': 0,
        '@typescript-eslint/semi': 1,
        '@typescript-eslint/quotes': ['error', 'single'],
        'no-floating-promise/no-floating-promise': 2,
        'no-return-await': 'error',
        'jest/no-disabled-tests': 'warn',
        'jest/no-focused-tests': 'error',
        'jest/no-identical-title': 'error',
        'jest/prefer-to-have-length': 'warn',
        'jest/valid-expect': 'error',
    },
    ignorePatterns: ['dist', '**/generated'],
    overrides: [{
        files: ['**/*.ts'],
    }]
};