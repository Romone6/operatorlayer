import { defineConfig } from "@playwright/test";

const configuredChannel = process.env.PLAYWRIGHT_CHANNEL;
const defaultWindowsChannel = process.platform === "win32" ? "msedge" : undefined;
const effectiveChannel = configuredChannel ?? defaultWindowsChannel;
const configuredBaseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3100";
const disableEmbeddedWebServer = process.env.PLAYWRIGHT_DISABLE_WEBSERVER === "1";
const configuredWebServerCommand =
  process.env.PLAYWRIGHT_WEBSERVER_COMMAND ??
  "node ./node_modules/next/dist/bin/next dev --port 3100";
const reuseExistingServer = process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER === "1";

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 60_000,
  use: {
    baseURL: configuredBaseUrl,
    headless: true,
    ...(effectiveChannel ? { channel: effectiveChannel } : {}),
  },
  ...(disableEmbeddedWebServer
    ? {}
    : {
        webServer: {
          command: configuredWebServerCommand,
          url: configuredBaseUrl,
          timeout: 120_000,
          reuseExistingServer,
          env: {
            OPERATORLAYER_DATA_BACKEND: "memory",
            OPERATORLAYER_TEST_AUTH_BYPASS: "1",
            OPERATORLAYER_ALLOW_TEST_BYPASS: "1",
            OPERATORLAYER_TEST_USER_ID: "e2e-user-001",
            OPERATORLAYER_TEST_ORG_ID: "e2e-org-001",
            OPERATORLAYER_PROCESSING_MODE: "deterministic",
            OPERATORLAYER_INLINE_JOB_RUNNER: "1",
          },
        },
      }),
});
