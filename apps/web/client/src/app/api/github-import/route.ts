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
            throw new Error(`Failed to import repository: ${response.statusText} - ${errorData}`);
        }

        const result = await response.json();
        return NextResponse.json(result);
    } catch (error) {
        console.error('Error importing repository:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to import repository' },
            { status: 500 }
        );
    }
} 