import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    // Get the Supabase URL from environment
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    
    if (!supabaseUrl) {
        return new Response('Supabase URL not configured', { status: 500 });
    }

    // Redirect to the Supabase function
    const githubAuthorizeUrl = `${supabaseUrl}/functions/v1/github-authorize`;
    
    return Response.redirect(githubAuthorizeUrl, 302);
} 