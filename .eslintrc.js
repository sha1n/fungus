module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    plugins: [
        '@typescript-eslint',
    ],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
    ],
    env: {
        'node': true
    },
    rules: {
        '@typescript-eslint/no-var-requires': 0,
        '@typescript-eslint/semi': 1,
        '@typescript-eslint/quotes': ['error', 'single'],
    },
    ignorePatterns: ['dist', '**/generated'],
    overrides: [{
        files: ['**/*.ts'],
    }]
};