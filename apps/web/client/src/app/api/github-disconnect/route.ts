import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { user_id } = body;

        if (!user_id) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            );
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        
        if (!supabaseUrl) {
            return NextResponse.json({ error: 'Supabase URL not configured' }, { status: 500 });
        }

        // Call the Supabase function to disconnect GitHub
        const response = await fetch(`${supabaseUrl}/functions/v1/github-disconnect`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id,
            }),
        });

        if (!response.ok) {
            const errorData = await response.text();
            let errorMessage = `Failed to disconnect GitHub account: ${response.statusText}`;
            let errorCode = 'DISCONNECT_ERROR';
            
            if (response.status === 404) {
                errorMessage = 'GitHub account not found or already disconnected.';
                errorCode = 'NOT_CONNECTED';
            } else if (response.status === 401) {
                errorMessage = 'Unauthorized to disconnect GitHub account.';
                errorCode = 'UNAUTHORIZED';
            } else if (errorData) {
                errorMessage += ` - ${errorData}`;
            }
            
            const error = new Error(errorMessage);
            (error as any).code = errorCode;
            throw error;
        }

        const result = await response.json();
        return NextResponse.json({
            success: true,
            message: 'GitHub account disconnected successfully',
            ...result
        });
    } catch (error) {
        console.error('Error disconnecting GitHub account:', error);
        
        let statusCode = 500;
        let errorMessage = 'Failed to disconnect GitHub account';
        let errorCode = 'UNKNOWN_ERROR';
        
        if (error instanceof Error) {
            errorMessage = error.message;
            const errorWithCode = error as any;
            
            if (errorWithCode.code) {
                errorCode = errorWithCode.code;
                
                // Map error codes to HTTP status codes
                switch (errorWithCode.code) {
                    case 'UNAUTHORIZED':
                        statusCode = 401;
                        break;
                    case 'NOT_CONNECTED':
                        statusCode = 404;
                        break;
                    case 'NETWORK_ERROR':
                        statusCode = 503;
                        break;
                    default:
                        statusCode = 500;
                }
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