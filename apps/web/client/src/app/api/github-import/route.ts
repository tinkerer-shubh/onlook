import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { user_id, repo } = body;

        if (!user_id || !repo) {
            return NextResponse.json(
                { error: 'User ID and repository name are required' },
                { status: 400 }
            );
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        
        if (!supabaseUrl) {
            return NextResponse.json({ error: 'Supabase URL not configured' }, { status: 500 });
        }

        // Call the Supabase function
        const response = await fetch(`${supabaseUrl}/functions/v1/github-import`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id,
                repo,
            }),
        });

        if (!response.ok) {
            const errorData = await response.text();
            let errorMessage = `Failed to import repository: ${response.statusText}`;
            let errorCode = 'IMPORT_ERROR';
            
            // Parse specific error types
            if (response.status === 401) {
                errorMessage = 'GitHub authentication failed. Please reconnect your account.';
                errorCode = 'UNAUTHORIZED';
            } else if (response.status === 404) {
                errorMessage = 'Repository not found or access denied.';
                errorCode = 'NOT_FOUND';
            } else if (response.status === 403) {
                errorMessage = 'Access forbidden. Check repository permissions.';
                errorCode = 'FORBIDDEN';
            } else if (errorData) {
                errorMessage += ` - ${errorData}`;
            }
            
            const error = new Error(errorMessage);
            (error as any).code = errorCode;
            throw error;
        }

        const result = await response.json();
        return NextResponse.json(result);
    } catch (error) {
        console.error('Error importing repository:', error);
        
        let statusCode = 500;
        let errorMessage = 'Failed to import repository';
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
                    case 'FORBIDDEN':
                        statusCode = 403;
                        break;
                    case 'NOT_FOUND':
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
                error: errorMessage,
                code: errorCode,
                details: error instanceof Error ? error.stack : undefined
            },
            { status: statusCode }
        );
    }
} 