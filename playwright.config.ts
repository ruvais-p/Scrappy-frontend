import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir: './tests', fullyParallel: false, workers: 1,
  use: {baseURL: process.env.SCRAPPY_BASE_URL || 'http://127.0.0.1:8080', trace: 'off', screenshot: 'only-on-failure'},
  reporter: 'list', timeout: 30000,
});
