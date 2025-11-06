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

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function proxyRequest(
  request: NextRequest,
  method: 'GET' | 'POST',
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
    method,
  });

  try {
    // Get request body if POST
    const body = method === 'POST' ? await request.text() : undefined;

    // Forward the request to the actual API endpoint
    const response = await fetch(url.toString(), {
      method,
      headers: request.headers,
      body,
    });

    // Get the response body as JSON
    const data = await response.json();

    // Return the response with explicit no-compression headers
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Content-Encoding': 'identity',
      },
    });
  } catch (error) {
    console.error('[x402 Proxy] Error forwarding request:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, 'GET', context);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, 'POST', context);
}
