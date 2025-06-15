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
        // Fetch GitHub user info via Supabase function
        const response = await fetch(`${supabaseUrl}/functions/v1/github-user-info?user_id=${userId}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                return NextResponse.json({ 
                    error: 'GitHub account not connected',
                    code: 'NOT_CONNECTED'
                }, { status: 404 });
            } else if (response.status === 401) {
                return NextResponse.json({ 
                    error: 'GitHub authentication expired',
                    code: 'UNAUTHORIZED'
                }, { status: 401 });
            }
            
            const errorData = await response.text();
            throw new Error(`Failed to fetch GitHub user info: ${response.statusText} - ${errorData}`);
        }

        const userInfo = await response.json();
        return NextResponse.json({
            success: true,
            user: userInfo
        });
    } catch (error) {
        console.error('Error fetching GitHub user info:', error);
        
        let errorMessage = 'Failed to fetch GitHub user information';
        let errorCode = 'UNKNOWN_ERROR';
        let statusCode = 500;
        
        if (error instanceof Error) {
            errorMessage = error.message;
            
            // Check for network errors
            if (error.message.includes('fetch') || error.message.includes('network')) {
                errorCode = 'NETWORK_ERROR';
                statusCode = 503;
            }
        }
        
        return NextResponse.json(
            { 
                success: false,
                error: errorMessage,
                code: errorCode
            },
            { status: statusCode }
        );
    }
} 