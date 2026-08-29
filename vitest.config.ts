import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only` is a build-time marker that throws when a client bundle
      // pulls it in. Under vitest there is no bundle to protect, so it
      // resolves to a stub and server modules stay directly testable.
      "server-only": fileURLToPath(new URL("./test/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    // Repository tests exercise the real store. Point it somewhere disposable
    // so a test run can never touch the data a dev server is using.
    env: { NIVAARAN_DATA_DIR: fileURLToPath(new URL("./node_modules/.tmp-nivaaran-test", import.meta.url)) },
  },
});
