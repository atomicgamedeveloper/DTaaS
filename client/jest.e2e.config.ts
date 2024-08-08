process.env.JEST_PLAYWRIGHT_CONFIG = './jest-playwright.config.ts'

module.exports = {
  preset: "jest-playwright-preset",
  testRegex: "/test/.*\\.spec.ts$",
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
  },
  collectCoverage: true,
  coverageReporters: ["text", "cobertura", "clover", "lcov", "json"],
  collectCoverageFrom: ["src/**/*.{ts,tsx}"],
  verbose: true
};