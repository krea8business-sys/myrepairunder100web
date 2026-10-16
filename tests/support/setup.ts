import { vi } from "vitest";

if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.SESSION_SECRET ||= "test-session-secret-0123456789abcdef0123456789";
process.env.HASH_SECRET ||= "test-hash-secret";

/** Minimal in-memory replacements for next/headers so route handlers can run in tests. */
export const testCookies = new Map<string, string>();
export const testHeaders = { ip: "203.0.113.10" };

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (testCookies.has(name) ? { name, value: testCookies.get(name)! } : undefined),
    set: (name: string, value: string) => void testCookies.set(name, value),
    delete: (name: string) => void testCookies.delete(name),
  }),
  headers: async () => new Headers({ "x-forwarded-for": testHeaders.ip }),
}));

vi.mock("next/server", async (orig) => {
  const mod = await orig<typeof import("next/server")>();
  return { ...mod, after: (fn: () => unknown) => void Promise.resolve().then(fn).catch(() => {}) };
});

vi.mock("react", async (orig) => {
  const mod = await orig<typeof import("react")>();
  return { ...mod, cache: <T extends (...a: never[]) => unknown>(fn: T) => fn };
});
