import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    
    if (!supabaseUrl) {
        return NextResponse.json({ error: 'Supabase URL not configured' }, { status: 500 });
    }

    try {
        // Call the Supabase function
        const response = await fetch(`${supabaseUrl}/functions/v1/github-list-repos?user_id=${userId}`);
        
        if (!response.ok) {
            let errorMessage = `Failed to fetch repositories: ${response.statusText}`;
            let errorCode = 'REPOSITORY_FETCH_ERROR';
            let statusCode = response.status;
            
            if (response.status === 404) {
                errorMessage = 'GitHub account not connected. Please connect your GitHub account first.';
                errorCode = 'NOT_CONNECTED';
            } else if (response.status === 401) {
                errorMessage = 'GitHub authentication failed. Please reconnect your account.';
                errorCode = 'UNAUTHORIZED';
            } else if (response.status === 403) {
                errorMessage = 'Access forbidden. Check your GitHub permissions.';
                errorCode = 'FORBIDDEN';
            }
            
            return NextResponse.json({ 
                error: errorMessage,
                code: errorCode 
            }, { status: statusCode });
        }

        const repositories = await response.json();
        return NextResponse.json(repositories);
    } catch (error) {
        console.error('Error fetching repositories:', error);
        
        let errorMessage = 'Failed to fetch repositories';
        let errorCode = 'UNKNOWN_ERROR';
        
        if (error instanceof Error) {
            errorMessage = error.message;
            
            // Check for network errors
            if (error.message.includes('fetch') || error.message.includes('network')) {
                errorCode = 'NETWORK_ERROR';
            }
        }
        
        return NextResponse.json(
            { 
                error: errorMessage,
                code: errorCode,
                details: error instanceof Error ? error.stack : undefined
            },
            { status: 500 }
        );
    }
} 