import { NextRequest, NextResponse } from 'next/server';

/**
 * x402 Payment Gateway - Catch-all Route Handler
 *
 * This route acts as a proxy that:
 * 1. Receives requests to /api/x402/* (after payment validation by middleware)
 * 2. Forwards them to the actual /api/* endpoints
 * 3. Returns the response back to the client
 *
 * Payment validation happens in src/middleware.ts using x402-next paymentMiddleware
 *
 * Pattern from: https://github.com/sragss/polymarketeer
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  // Reconstruct the original API path without the x402 prefix
  const params = await context.params;
  const apiPath = `/api/${params.path.join('/')}`;

  // Build the full URL for the proxied request
  const url = new URL(apiPath, request.url);
  url.search = request.nextUrl.search; // Preserve query parameters

  console.log('[x402 Proxy] Forwarding request:', {
    original: request.url,
    proxied: url.toString(),
  });

  try {
    // Forward the request to the actual API endpoint
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: request.headers,
    });

    // Return the response with original status and headers
    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (error) {
    console.error('[x402 Proxy] Error forwarding request:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
