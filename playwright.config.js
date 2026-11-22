const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  // Separate from Hardhat's test/ discovery: browser tests do not execute Solidity.
  testDir: './tests/ui',
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    browserName: 'chromium',
    viewport: { width: 1366, height: 768 },
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'npm run serve',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: false,
    timeout: 30000
  }
});
