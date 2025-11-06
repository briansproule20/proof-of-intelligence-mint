import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/x402/answer
 *
 * x402-protected answer endpoint that proxies to /api/answer
 *
 * PURPOSE:
 * - Minimal payment (0.0001 USDC) for x402scan visibility
 * - Makes answers discoverable on x402 network
 * - Proxies to public /api/answer endpoint for actual verification
 *
 * FLOW:
 * 1. x402 middleware validates 0.0001 USDC payment
 * 2. This handler forwards POST request to /api/answer
 * 3. /api/answer verifies answer and mints tokens if correct
 * 4. Response is returned to user
 *
 * NOTE: Users can also call /api/answer directly for free if they don't want x402scan visibility
 */

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    console.log('[API x402/answer] Proxying to /api/answer');

    // Build URL for /api/answer
    const url = new URL('/api/answer', request.url);
    url.search = request.nextUrl.search; // Preserve query parameters

    // Get request body
    const body = await request.text();

    // Forward to /api/answer
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: request.headers,
      body,
    });

    // Get response data
    const data = await response.json();

    console.log('[API x402/answer] Proxied response:', { status: response.status });

    // Return response
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('[API x402/answer] Error proxying request:', error);
    return NextResponse.json(
      {
        error: 'Failed to process answer',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
