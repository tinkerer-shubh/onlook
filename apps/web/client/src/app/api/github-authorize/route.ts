import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    
    // Get the Supabase URL from environment
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    
    if (!supabaseUrl) {
        return new Response('Supabase URL not configured', { status: 500 });
    }

    // Build the authorization URL with user context
    const githubAuthorizeUrl = new URL(`${supabaseUrl}/functions/v1/github-authorize`);
    
    // Pass user ID if provided
    if (userId) {
        githubAuthorizeUrl.searchParams.set('user_id', userId);
    }
    
    return Response.redirect(githubAuthorizeUrl.toString(), 302);
} 