// @ts-nocheck
// deno-lint-ignore-file no-explicit-any
import { assertEquals, assert } from "https://deno.land/std@0.203.0/testing/asserts.ts";

// --- Helper to capture handler passed to Deno.serve ---
async function captureServe(cb: () => Promise<void> | void) {
  let captured: ((req: Request) => Response | Promise<Response>) | undefined;
  const denoAny = (globalThis as any).Deno;
  // redefine serve to capture handler
  Object.defineProperty(denoAny, "serve", {
    value: (h: typeof captured) => {
      captured = h;
    },
    configurable: true,
    writable: true,
  });
  const maybePromise = cb();
  if (maybePromise instanceof Promise) {
    await maybePromise;
  }
  if (!captured) throw new Error("Handler not captured");
  return captured!;
}

Deno.test("github-authorize redirects with state cookie", async () => {
  const handler = await captureServe(async () => {
    await import("../github-authorize/index.ts");
  });

  const res = await handler(new Request("https://example.com/github-authorize"));
  assertEquals(res.status, 302);
  const loc = res.headers.get("Location");
  assert(loc && loc.startsWith("https://github.com/login/oauth/authorize"));
  const setCookie = res.headers.get("Set-Cookie");
  assert(setCookie && setCookie.includes("gh_oauth_state="));
});

Deno.test("github-import-status validates id param", async () => {
  const handler = await captureServe(async () => {
    await import("../github-import-status/index.ts");
  });

  const res = await handler(new Request("https://example.com/github-import-status"));
  assertEquals(res.status, 400);
}); 