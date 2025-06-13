import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { nanoid } from 'https://esm.sh/nanoid@4';

// GitHub OAuth Authorization Endpoint
// Redirects the requester to GitHub's OAuth consent page with the appropriate
// client id, redirect URI, scopes, and a CSRF-protective state parameter.

const GITHUB_CLIENT_ID = Deno.env.get('GITHUB_CLIENT_ID');
if (!GITHUB_CLIENT_ID) {
  console.error('Missing GITHUB_CLIENT_ID env variable');
}

Deno.serve((req) => {
  // Determine redirect_uri dynamically if not provided via env
  const url = new URL(req.url);
  const redirectUri = Deno.env.get('GITHUB_REDIRECT_URI') ?? `${url.origin}/auth/callback/github`;

  const state = nanoid(32);
  const scope = 'repo'; // include both public & private repo access

  const githubAuthUrl =
    `https://github.com/login/oauth/authorize?` +
    `client_id=${encodeURIComponent(GITHUB_CLIENT_ID ?? '')}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scope)}` +
    `&state=${encodeURIComponent(state)}`;

  const headers = new Headers({
    Location: githubAuthUrl,
    'Set-Cookie': `gh_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax`,
  });

  return new Response(null, { status: 302, headers });
}); 