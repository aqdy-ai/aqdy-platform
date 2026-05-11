/**
 * Jest configuration for Backend
 * Location: backend/jest.config.js
 */
export default {
  testEnvironment: 'node',
  verbose: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      lines: 60, // الالتزام بنسبة 60% المطلوبة في المشروع
    },
  },
};