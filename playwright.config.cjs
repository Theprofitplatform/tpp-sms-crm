/**
 * Playwright Test Configuration
 */

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'test-results/html' }]
  ],
  use: {
    baseURL: process.env.TEST_REACT ? 'http://localhost:5173' : 'http://localhost:9000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],

  webServer: process.env.TEST_REACT ? {
    command: 'cd dashboard && npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  } : {
    command: 'node dashboard-server.js',
    url: 'http://localhost:9000',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
});
