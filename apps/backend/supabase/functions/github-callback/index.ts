import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// -- GitHub OAuth callback handler --
// Exchanges ?code for an access token and stores it securely in Supabase.
// Expects the browser to carry a cookie `gh_oauth_state` that matches the
// `state` query param (basic CSRF protection).

const GITHUB_CLIENT_ID = Deno.env.get("GITHUB_CLIENT_ID");
const GITHUB_CLIENT_SECRET = Deno.env.get("GITHUB_CLIENT_SECRET");

if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
  console.error("Missing GitHub OAuth env vars");
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const userId = url.searchParams.get("user_id");

  if (!code || !returnedState) {
    return new Response("Invalid callback parameters", { status: 400 });
  }

  // Verify state cookie
  const cookieHeader = req.headers.get("cookie") ?? "";
  const stateCookie = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("gh_oauth_state="));
  const storedState = stateCookie?.split("=")[1];
  if (!storedState || storedState !== returnedState) {
    return new Response("State mismatch", { status: 400 });
  }

  // Extract user ID from state if present (format: "state:userId")
  let extractedUserId = userId; // From URL param
  if (!extractedUserId && returnedState.includes(':')) {
    const stateParts = returnedState.split(':');
    if (stateParts.length === 2) {
      extractedUserId = stateParts[1];
    }
  }

  // Exchange code for access token
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  if (!tokenRes.ok) {
    const txt = await tokenRes.text();
    console.error("GitHub token exchange failed", txt);
    return new Response("GitHub token exchange failed", { status: 500 });
  }
  const tokenJson = await tokenRes.json();
  const accessToken = tokenJson.access_token as string | undefined;
  if (!accessToken) {
    console.error("No access token in GitHub response", tokenJson);
    return new Response("No access token", { status: 500 });
  }

  // Associate with authenticated Supabase user
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  const insertData: any = {
    access_token: accessToken,
    created_at: new Date().toISOString(),
  };
  
  // Add user_id if provided
  if (extractedUserId) {
    insertData.user_id = extractedUserId;
  }
  
  const { error } = await supabase.from("github_tokens").insert(insertData);
  if (error) {
    console.error("Supabase insert error", error);
    return new Response("DB error", { status: 500 });
  }

  // Clear state cookie and redirect back to app
  const headers = new Headers({
    "Set-Cookie": "gh_oauth_state=deleted; Path=/; Max-Age=0",
    Location: "/import/github?connected=1",
  });
  return new Response(null, { status: 302, headers });
}); 