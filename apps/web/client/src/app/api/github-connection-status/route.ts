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
        // Check GitHub connection status via Supabase function
        const response = await fetch(`${supabaseUrl}/functions/v1/github-connection-status?user_id=${userId}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                return NextResponse.json({ 
                    connected: false,
                    error: 'GitHub account not connected' 
                }, { status: 200 });
            }
            throw new Error(`Failed to check connection status: ${response.statusText}`);
        }

        const connectionData = await response.json();
        return NextResponse.json({
            connected: true,
            ...connectionData
        });
    } catch (error) {
        console.error('Error checking GitHub connection status:', error);
        
        let errorMessage = 'Failed to check connection status';
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
                connected: false,
                error: errorMessage,
                code: errorCode
            },
            { status: 500 }
        );
    }
} 