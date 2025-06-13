import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// GitHub Repository Listing Endpoint
// GET /github-list-repos?user_id=<uuid>
// Looks up the user's stored GitHub access token in `github_tokens` table and
// returns a simplified list of repositories (name, full_name, private, html_url).

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const userId = url.searchParams.get("user_id");

  if (!userId) {
    return new Response("Missing user_id", { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: tokenRow, error } = await supabase
    .from("github_tokens")
    .select("access_token")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("DB error", error);
    return new Response("DB error", { status: 500 });
  }

  if (!tokenRow?.access_token) {
    return new Response("No GitHub token for user", { status: 404 });
  }

  const ghRes = await fetch("https://api.github.com/user/repos?per_page=100", {
    headers: {
      Authorization: `token ${tokenRow.access_token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "onlook-app",
    },
  });

  if (!ghRes.ok) {
    const txt = await ghRes.text();
    console.error("GitHub API error", txt);
    return new Response("GitHub API error", { status: 502 });
  }

  const repos = await ghRes.json();
  // Map to minimal payload
  const simplified = repos.map((r: any) => ({
    id: r.id,
    name: r.name,
    full_name: r.full_name,
    private: r.private,
    fork: r.fork,
    html_url: r.html_url,
  }));

  return new Response(JSON.stringify(simplified), {
    headers: { "Content-Type": "application/json" },
  });
}); 