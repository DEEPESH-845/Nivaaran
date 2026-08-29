import { defineConfig, devices } from "@playwright/test";

/**
 * A dedicated port, not 3000.
 *
 * `reuseExistingServer` will happily attach to whatever is already listening,
 * and on a machine running more than one project that is somebody else's app.
 * Overridable with E2E_PORT if 3100 is also taken.
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "line" : [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `next dev --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // A run must not inherit the dev server's data: sign-ups and filed claims
    // from a test should never land in what a developer is looking at.
    env: {
      NIVAARAN_DATA_DIR: ".data/e2e",
      // A parallel suite signs in more often in a minute than any real person.
      // The shipped defaults stay strict; see lib/security/ratelimit.ts.
      RATE_LIMIT_LOGIN: "500",
      RATE_LIMIT_LOGINIP: "500",
      RATE_LIMIT_SIGNUP: "500",
      RATE_LIMIT_WRITE: "500",
    },
  },
});
