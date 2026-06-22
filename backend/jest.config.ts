// jest.config.ts
import type { JestConfigWithTsJest } from "ts-jest";

const jestConfig: JestConfigWithTsJest = {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    // This maps the .js imports in your TS files to the actual .ts files
    "^(\\.\\.?/.*)\\.js$": "$1",
    // Force resolution of hoisted monorepo packages
    "^@langfuse/langchain$": "<rootDir>/../node_modules/@langfuse/langchain",
    "^langfuse$": "<rootDir>/tests/__mocks__/langfuse.ts",
    "pdfjs-dist/legacy/build/pdf.mjs": "<rootDir>/tests/__mocks__/pdfjs-dist.js",
  },
  moduleDirectories: ["node_modules", "<rootDir>/node_modules", "../../node_modules"],
  moduleFileExtensions: ["ts", "js", "json", "node"],
  transform: {
    // Use ts-jest to transform TypeScript files with ESM support
    "^.+\\.ts$": [
      "ts-jest",
      {
        useESM: true,
      },
    ],
  },
  setupFiles: ["<rootDir>/tests/setup-env-vars.ts"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup-env.ts"],
  testMatch: ["**/tests/**/*.test.ts"],
  testTimeout: 30000,
  silent: false,
};

export default jestConfig;