import "server-only";
import { after } from "next/server";

/** Run work after the response is sent; falls back to fire-and-forget where after() is unavailable. */
export function runAfter(fn: () => Promise<unknown> | unknown) {
  try {
    after(fn);
  } catch {
    void Promise.resolve().then(fn).catch(() => {});
  }
}
