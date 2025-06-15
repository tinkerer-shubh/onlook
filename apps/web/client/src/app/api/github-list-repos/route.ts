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
            if (response.status === 404) {
                return NextResponse.json({ error: 'GitHub account not connected' }, { status: 404 });
            }
            throw new Error(`Failed to fetch repositories: ${response.statusText}`);
        }

        const repositories = await response.json();
        return NextResponse.json(repositories);
    } catch (error) {
        console.error('Error fetching repositories:', error);
        return NextResponse.json(
            { error: 'Failed to fetch repositories' },
            { status: 500 }
        );
    }
} 