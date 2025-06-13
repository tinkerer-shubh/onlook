import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// GitHub Repository Import Endpoint (subtask 2.4)
// POST /github-import  { user_id: string, repo: string }
// - Looks up user's GitHub token
// - Downloads repo tarball
// - Uploads tarball to Supabase Storage (bucket "imports")
// - Inserts row in `github_imports` table and returns operation id

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let body: { user_id?: string; repo?: string };
  try {
    body = await req.json();
  } catch (_) {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { user_id, repo } = body;
  if (!user_id || !repo) {
    return new Response("Missing user_id or repo", { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Fetch token
  const { data: tokenRow, error: tokenErr } = await supabase
    .from("github_tokens")
    .select("access_token")
    .eq("user_id", user_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (tokenErr) {
    console.error("DB token fetch error", tokenErr);
    return new Response("DB error", { status: 500 });
  }
  if (!tokenRow?.access_token) {
    return new Response("No GitHub token", { status: 404 });
  }

  // Download tarball
  const tarballUrl = `https://api.github.com/repos/${repo}/tarball`;
  const ghRes = await fetch(tarballUrl, {
    headers: {
      Authorization: `token ${tokenRow.access_token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "onlook-app",
    },
  });
  if (!ghRes.ok) {
    const txt = await ghRes.text();
    console.error("GitHub tarball error", txt);
    return new Response("GitHub download failed", { status: 502 });
  }

  const arrayBuf = await ghRes.arrayBuffer();
  const bytes = new Uint8Array(arrayBuf);

  // Upload to storage bucket `imports`
  const objectPath = `${user_id}/${repo.replace("/", "-")}-${Date.now()}.tar.gz`;
  const { error: uploadErr } = await supabase.storage
    .from("imports")
    .upload(objectPath, bytes, {
      contentType: "application/gzip",
      upsert: true,
    });
  if (uploadErr) {
    console.error("Storage upload error", uploadErr);
    return new Response("Storage upload failed", { status: 500 });
  }

  // Insert job record
  const { data: jobRow, error: jobErr } = await supabase
    .from("github_imports")
    .insert({
      user_id,
      repo_full_name: repo,
      storage_path: objectPath,
      status: "completed",
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (jobErr) {
    console.error("DB insert import", jobErr);
    return new Response("DB error", { status: 500 });
  }

  return new Response(JSON.stringify({ operation_id: jobRow.id }), {
    headers: { "Content-Type": "application/json" },
  });
}); 