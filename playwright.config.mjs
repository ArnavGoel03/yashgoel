import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./browser-tests",
  testMatch: "**/*.e2e.mjs",
  workers: 1,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:3189",
    launchOptions: { args: ["--remote-debugging-port=9333"] },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "phone", testIgnore: "**/overflow.e2e.mjs", use: { viewport: { width: 390, height: 844 } } },
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
  ],
  webServer: {
    command: "pnpm start --hostname 127.0.0.1 --port 3189",
    url: "http://127.0.0.1:3189",
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
