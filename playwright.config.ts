import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5174",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
});
