import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const userId = searchParams.get('user_id'); // Pass user ID through state or session

    // Handle OAuth errors
    if (error) {
        console.error('GitHub OAuth error:', error);
        return NextResponse.redirect(
            new URL(`/import/github?error=${encodeURIComponent(error)}`, request.url)
        );
    }

    // Validate required parameters
    if (!code || !state) {
        console.error('Missing required OAuth parameters');
        return NextResponse.redirect(
            new URL('/import/github?error=invalid_callback', request.url)
        );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    
    if (!supabaseUrl) {
        console.error('Supabase URL not configured');
        return NextResponse.redirect(
            new URL('/import/github?error=configuration_error', request.url)
        );
    }

    try {
        // Forward the callback to the Supabase function with user context
        const callbackUrl = new URL(`${supabaseUrl}/functions/v1/github-callback`);
        callbackUrl.searchParams.set('code', code);
        callbackUrl.searchParams.set('state', state);
        if (userId) {
            callbackUrl.searchParams.set('user_id', userId);
        }

        // Forward cookies for state verification
        const response = await fetch(callbackUrl.toString(), {
            method: 'GET',
            headers: {
                'Cookie': request.headers.get('cookie') || '',
            },
            redirect: 'manual', // Don't follow redirects automatically
        });

        if (response.status === 302) {
            // Get the redirect location from the backend
            const location = response.headers.get('location');
            if (location) {
                // If it's a relative URL, make it absolute
                const redirectUrl = location.startsWith('/') 
                    ? new URL(location, request.url)
                    : new URL(location);
                
                return NextResponse.redirect(redirectUrl);
            }
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error('GitHub callback failed:', errorText);
            return NextResponse.redirect(
                new URL(`/import/github?error=${encodeURIComponent('callback_failed')}`, request.url)
            );
        }

        // Success - redirect to GitHub import page
        return NextResponse.redirect(
            new URL('/import/github?connected=1', request.url)
        );

    } catch (err) {
        console.error('Error processing GitHub callback:', err);
        return NextResponse.redirect(
            new URL(`/import/github?error=${encodeURIComponent('processing_error')}`, request.url)
        );
    }
} 