export default {
  // Use projects to separate Node and React test environments
  projects: [
    // Node environment for backend/API tests
    {
      displayName: 'node',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/tests/unit/*.test.js',
        '<rootDir>/tests/integration/*.test.js',
        '!<rootDir>/tests/unit/api-connect.test.js',
        '!<rootDir>/tests/unit/audit.test.js',
        '!<rootDir>/tests/unit/dashboard/**/*',
        '!<rootDir>/tests/integration/dashboard/**/*'
      ],
      testPathIgnorePatterns: [
        '/node_modules/',
        '/_archive/',
        '/files/',
        '/tests/unit/api-connect.test.js',
        '/tests/unit/audit.test.js',
        '/tests/unit/dashboard/',
        '/tests/integration/dashboard/'
      ],
      modulePathIgnorePatterns: [
        '/_archive/',
        '/files/'
      ],
      transform: {},
      transformIgnorePatterns: []
    },
    // jsdom environment for React tests
    {
      displayName: 'react',
      testEnvironment: 'jsdom',
      testMatch: [
        '<rootDir>/tests/unit/dashboard/**/*.test.js',
        '<rootDir>/tests/unit/dashboard/**/*.test.jsx',
        '<rootDir>/tests/integration/dashboard/**/*.test.js',
        '<rootDir>/tests/integration/dashboard/**/*.test.jsx'
      ],
      setupFilesAfterEnv: [
        '<rootDir>/tests/setup/react-setup.js'
      ],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/dashboard/src/$1',
        '\\.(css|less|scss|sass)$': '<rootDir>/tests/mocks/styleMock.js'
      },
      testPathIgnorePatterns: [
        '/node_modules/',
        '/_archive/',
        '/files/'
      ],
      modulePathIgnorePatterns: [
        '/_archive/',
        '/files/'
      ],
      transform: {
        '^.+\\.(js|jsx)$': 'babel-jest'
      },
      transformIgnorePatterns: [
        'node_modules/(?!(lucide-react|clsx|tailwind-merge|class-variance-authority)/)'
      ]
    }
  ],

  // Coverage configuration (combined from both projects)
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/audit/**/*.js',
    'src/monitoring/**/*.js',
    'src/utils/**/*.js',
    'dashboard/src/**/*.js',
    'dashboard/src/**/*.jsx',
    '!src/**/*.test.js',
    '!dashboard/src/**/*.test.js',
    '!dashboard/src/**/*.test.jsx',
    '!src/utils/EMERGENCY-*.js',
    '!src/utils/REPAIR-*.js',
    '!src/utils/RESTORE-*.js',
    '!src/deployment/**/*.js',
    '!src/audit/check-and-fix-plugins.js',
    '!src/audit/check-current-homepage.js',
    '!src/audit/extract-homepage-from-sql.js',
    '!src/audit/extract-homepage-simplified.js',
    '!src/utils/diagnose-shortcode-issue.js',
    '!src/utils/emergency-slider-fix.js',
    '!src/utils/fix-current-homepage.js',
    '!src/utils/fix-homepage-quick.js',
    '!src/utils/fix-homepage-visual.js',
    '!src/audit/complete-optimization.js',
    '!src/monitoring/monitor-rankings.js'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json-summary'
  ]
};
