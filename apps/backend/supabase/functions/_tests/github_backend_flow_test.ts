// @ts-nocheck
// deno-lint-ignore-file no-explicit-any

// Comprehensive test suite for GitHub backend endpoints (Task 2 – sub-task 6)
import {
  assertEquals,
  assert,
} from "https://deno.land/std@0.203.0/testing/asserts.ts";

// -------------------- helpers --------------------
// Capture handler passed to Deno.serve so we can invoke it directly.
async function captureServe(cb: () => Promise<void> | void) {
  let captured: (req: Request) => Response | Promise<Response>;
  const denoAny = (globalThis as any).Deno;
  const originalServe = denoAny.serve;
  denoAny.serve = (h: typeof captured) => {
    captured = h;
  };
  try {
    const maybe = cb();
    if (maybe instanceof Promise) await maybe;
    if (!captured) throw new Error("Handler not captured");
    return captured!;
  } finally {
    denoAny.serve = originalServe; // restore
  }
}

// Utility to stub global fetch with a queue of predetermined responses.
function withStubbedFetch(responders: Array<(input: Request | string) => Response>) {
  const originalFetch = globalThis.fetch;
  let callIndex = 0;
  (globalThis as any).fetch = (input: any, init?: any) => {
    const responder = responders[callIndex++] ?? responders[responders.length - 1];
    return Promise.resolve(responder(input));
  };
  return () => {
    (globalThis as any).fetch = originalFetch;
  };
}

// Provide fake env vars for Supabase & GitHub.
Deno.env.set("SUPABASE_URL", "https://supabase.test");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
Deno.env.set("GITHUB_CLIENT_ID", "id");
Deno.env.set("GITHUB_CLIENT_SECRET", "secret");

// -------------------- Tests --------------------
let callbackHandler: (req: Request) => Promise<Response> | Response;
let importHandler: (req: Request) => Promise<Response> | Response;
let listReposHandler: (req: Request) => Promise<Response> | Response;

Deno.test({ name: "github-callback – success flow", sanitizeResources: false, sanitizeOps: false, fn: async () => {
  // Stub fetch: 1) GitHub token exchange success
  const restoreFetch = withStubbedFetch([
    () =>
      new Response(JSON.stringify({ access_token: "gh-tok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    // Supabase insert success
    () => new Response(JSON.stringify([{ id: 1 }]), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    }),
  ]);

  callbackHandler = await captureServe(async () => {
    await import("../github-callback/index.ts");
  });

  const res = await callbackHandler(
    new Request(
      "https://example.com/github-callback?code=abc&state=s123",
      {
        headers: { cookie: "gh_oauth_state=s123" },
      },
    ),
  );

  assertEquals(res.status, 302);
  assertEquals(res.headers.get("Location"), "/import/github?connected=1");
  const setCookie = res.headers.get("Set-Cookie") ?? "";
  assert(setCookie.includes("gh_oauth_state=deleted"));

  restoreFetch();
}});

Deno.test({ name: "github-callback – state mismatch", sanitizeResources: false, sanitizeOps: false, fn: async () => {
  const res = await callbackHandler(
    new Request("https://example.com/github-callback?code=abc&state=s1", {
      headers: { cookie: "gh_oauth_state=DIFFERENT" },
    }),
  );
  assertEquals(res.status, 400);
}});

Deno.test({ name: "github-list-repos – happy path", sanitizeResources: false, sanitizeOps: false, fn: async () => {
  // GitHub API returns list of repos
  const restoreFetch = withStubbedFetch([
    // Supabase token row fetch
    () => new Response(JSON.stringify([{ access_token: "tok" }]), {
      headers: { "Content-Type": "application/json" },
    }),
    () =>
      new Response(
        JSON.stringify([
          { id: 1, name: "r1", full_name: "u/r1", private: false, fork: false, html_url: "url" },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
  ]);

  listReposHandler = await captureServe(async () => {
    await import("../github-list-repos/index.ts");
  });

  const res = await listReposHandler(new Request("https://ex.com/github-list-repos?user_id=u1"));
  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(json.length, 1);
  assertEquals(json[0].full_name, "u/r1");

  restoreFetch();
}});

Deno.test({ name: "github-import – missing fields", sanitizeResources: false, sanitizeOps: false, fn: async () => {
  importHandler = await captureServe(async () => {
    await import("../github-import/index.ts");
  });
  const res = await importHandler(new Request("https://ex.com/github-import", { method: "POST", body: "{}" }));
  assertEquals(res.status, 400);
}});

Deno.test({ name: "github-import – happy path", sanitizeResources: false, sanitizeOps: false, fn: async () => {
  // Fetch sequence:
  // 1) Supabase token row
  // 2) GitHub tarball
  // 3) Supabase storage upload
  // 4) Supabase insert job row
  const restoreFetch = withStubbedFetch([
    () => new Response(JSON.stringify([{ access_token: "tok" }]), {
      headers: { "Content-Type": "application/json" },
    }),
    () => new Response(new Uint8Array([1, 2, 3])),
    () => new Response(JSON.stringify({ Key: "obj" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }), // storage upload ok
    () => new Response(JSON.stringify({ id: "mock-id" }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    }),
  ]);

  const reqBody = JSON.stringify({ user_id: "u1", repo: "foo/bar" });
  const res = await importHandler(
    new Request("https://ex.com/github-import", { method: "POST", body: reqBody }),
  );

  assertEquals(res.status, 200);
  const { operation_id } = await res.json();
  assert(operation_id);

  restoreFetch();
}}); 