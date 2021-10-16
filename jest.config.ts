export default {
  testMatch: ['**/test/**/*.spec.ts'],
  roots: ['./test'],
  coveragePathIgnorePatterns: [],
  reporters: [
    'default', 
    ['jest-summary-reporter', {failuresOnly: true}], 
    ['jest-html-reporters', {filename: '.local/jest_test_report.html'}],
  ],
  verbose: true,
  maxWorkers: '100%',
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  testEnvironment: 'node',
  preset: 'ts-jest',
  slowTestThreshold: 1.5 * 1000,
  testTimeout: 10 * 1000,
  setupFilesAfterEnv: ['jest-extended/all'],
};
