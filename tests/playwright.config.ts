import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PORT ?? 4173);

export default defineConfig({
  testDir: './specs',
  // The pages are static: nothing they do depends on test order.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Third-party requests are stubbed, so the suite is hermetic. One retry
  // only absorbs timing jitter on a loaded runner while waiting for the hero
  // animation; a genuine break still fails twice.
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'node serve.mjs ..',
    url: `http://localhost:${PORT}/index.html`,
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
