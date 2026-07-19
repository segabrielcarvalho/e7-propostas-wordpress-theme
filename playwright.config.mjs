import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: false,
  use: {
    baseURL: process.env.E7_PROPOSALS_BASE_URL || 'http://proposal.e7-company.local',
    browserName: 'chromium',
    headless: true,
    launchOptions: {
      executablePath: process.env.E7_CHROME_PATH || '/usr/bin/google-chrome',
      args: ['--host-resolver-rules=MAP proposal.e7-company.local 127.0.0.1'],
    },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
