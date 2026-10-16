/**
 * Integration tests run against TEST_DATABASE_URL (a separate, disposable database).
 * If it isn't set, integration suites are skipped and only unit tests run.
 */
import { execSync } from "node:child_process";

export default function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    console.warn("\n[tests] TEST_DATABASE_URL not set — integration tests will be skipped.\n");
    return;
  }
  const env = { ...process.env, DATABASE_URL: url, ADMIN_EMAIL: "", ADMIN_PASSWORD: "", NODE_ENV: "test" as const };
  execSync("npx tsx scripts/migrate.ts", { env, stdio: "inherit" });
  execSync("npx tsx scripts/seed.ts --reset", { env, stdio: "inherit" });
}
