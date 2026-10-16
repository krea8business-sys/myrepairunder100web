/** Secret loading shared by Node and Edge runtimes. */
let warned = false;

export function sessionKey(): Uint8Array {
  let secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET must be set (32+ characters) in production.");
    }
    if (!warned) {
      console.warn("SESSION_SECRET missing/short — using an insecure development fallback.");
      warned = true;
    }
    secret = "dev-only-insecure-session-secret-change-me-please";
  }
  return new TextEncoder().encode(secret);
}
