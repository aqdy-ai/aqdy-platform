export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",

  extensionsToTreatAsEsm: [".ts"],

  transform: {
    "^.+\\.ts$": ["ts-jest", { useESM: true }],
  },

  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },

  setupFiles: ["<rootDir>/tests/setup-env.ts"],

  testMatch: ["**/tests/**/*.test.ts"],
  silent: true
};