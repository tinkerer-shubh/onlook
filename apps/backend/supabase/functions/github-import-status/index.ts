import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Import Status Endpoint (subtask 2.5)
// GET /github-import-status?id=<operation_id>
// Returns { id, status, created_at, repo_full_name, storage_path }

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return new Response("Missing id", { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase
    .from("github_imports")
    .select("id, status, created_at, repo_full_name, storage_path")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("DB fetch error", error);
    return new Response("DB error", { status: 500 });
  }

  if (!data) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}); 