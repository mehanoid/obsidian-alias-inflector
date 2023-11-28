module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./setupTests.ts'],
  testPathIgnorePatterns: ["<rootDir>/node_modules/"],
  testMatch: [
    "**/*.test.ts"
  ],
};
