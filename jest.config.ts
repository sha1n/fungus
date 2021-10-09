module.exports = {
  testMatch: ['**/test/**/*.spec.ts'],
  roots: ['./test'],
  coveragePathIgnorePatterns: [],
  reporters: ['default', ['jest-summary-reporter', {failuresOnly: true}]],
  verbose: true,
  maxWorkers: '100%',
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  testEnvironment: 'node',
  preset: 'ts-jest',
  slowTestThreshold: 1500,
  testTimeout: 10000,
};
