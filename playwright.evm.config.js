const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/ui-evm',
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  reporter: 'list',
  outputDir: 'test-results/ui-evm',
  use: {
    baseURL: 'http://127.0.0.1:13000',
    browserName: 'chromium',
    viewport: { width: 1366, height: 768 },
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  // Never reuse the manual demo: this suite advances its own local chain's time.
  // Playwright refuses occupied ports and owns cleanup of these two processes.
  webServer: [
    {
      command: 'hardhat node --hostname 127.0.0.1 --port 18545',
      port: 18545,
      reuseExistingServer: false,
      timeout: 30000
    },
    {
      command: 'serve demo --listen tcp://127.0.0.1:13000',
      url: 'http://127.0.0.1:13000',
      reuseExistingServer: false,
      timeout: 30000
    }
  ]
});
