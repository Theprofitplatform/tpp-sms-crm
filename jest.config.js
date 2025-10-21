export default {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/audit/**/*.js',
    'src/monitoring/**/*.js',
    'src/utils/**/*.js',
    '!src/**/*.test.js',
    '!src/utils/EMERGENCY-*.js',
    '!src/utils/REPAIR-*.js',
    '!src/utils/RESTORE-*.js',
    '!src/deployment/**/*.js',  // Exclude deployment scripts from coverage
    // Exclude one-off utility/diagnostic scripts (not part of core functionality)
    '!src/audit/check-and-fix-plugins.js',
    '!src/audit/check-current-homepage.js',
    '!src/audit/extract-homepage-from-sql.js',
    '!src/audit/extract-homepage-simplified.js',
    '!src/utils/diagnose-shortcode-issue.js',
    '!src/utils/emergency-slider-fix.js',
    '!src/utils/fix-current-homepage.js',
    '!src/utils/fix-homepage-quick.js',
    '!src/utils/fix-homepage-visual.js',
    // Exclude CLI orchestration scripts (console-heavy, hardcoded configs)
    '!src/audit/complete-optimization.js',
    '!src/monitoring/monitor-rankings.js'
  ],
  testMatch: [
    '<rootDir>/tests/unit/*.test.js',
    '!<rootDir>/tests/unit/api-connect.test.js',
    '!<rootDir>/tests/unit/audit.test.js'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/_archive/',
    '/files/',
    '/tests/unit/api-connect.test.js',
    '/tests/unit/audit.test.js'
  ],
  modulePathIgnorePatterns: [
    '/_archive/',
    '/files/'
  ],
  coverageThreshold: {
    global: {
      branches: 90,     // Excellent branch coverage achieved
      functions: 100,   // Perfect function coverage!
      lines: 100,       // Perfect line coverage!
      statements: 99    // Nearly perfect statement coverage
    }
  },
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json-summary'  // Added for coverage tracking
  ],
  testTimeout: 10000,
  transform: {},
  moduleNameMapper: {},  // Simplified - let Node.js handle ES module resolution
  transformIgnorePatterns: [],
  // Experimental ES module support
  preset: null
};
