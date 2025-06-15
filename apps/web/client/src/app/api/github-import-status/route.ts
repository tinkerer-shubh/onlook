import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const operationId = searchParams.get('id');

    if (!operationId) {
        return NextResponse.json(
            { error: 'Operation ID is required' },
            { status: 400 }
        );
    }

    try {
        // Call the Supabase function to check import status
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/github-import-status?id=${operationId}`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Supabase function error:', errorText);
            return NextResponse.json(
                { error: 'Failed to fetch import status' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching import status:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 