import { paymentMiddleware } from 'x402-next';
import { createFacilitatorConfig } from '@coinbase/x402';
import { x402RoutesConfig } from './lib/x402-routes';
import type { NextRequest } from 'next/server';

/**
 * x402 Payment Middleware - Polymarketeer Pattern
 *
 * This middleware:
 * 1. Intercepts requests to /api/x402/*
 * 2. Validates payment (1.25 USDC to server wallet)
 * 3. If payment succeeds, allows request to proceed to the catch-all proxy
 * 4. The proxy forwards to actual /api/* endpoints
 *
 * Pattern from: https://github.com/sragss/polymarketeer
 *
 * Payment flow:
 * - User requests /api/x402/question → Pays 1.25 USDC → Gets question
 * - User submits answer to /api/answer/:id → FREE (just verify + mint)
 */
const RECIPIENT_ADDRESS = (
  process.env.MINT_SIGNER_ADDRESS || '0x32d831cd322EB5DF497A1A640175a874b5372BF8'
) as `0x${string}`;

console.log('[Middleware] Loading x402 middleware with recipient:', RECIPIENT_ADDRESS);
console.log('[Middleware] CDP API Key ID:', process.env.CDP_API_KEY_ID ? 'SET' : 'NOT SET');
console.log('[Middleware] CDP API Key Secret:', process.env.CDP_API_KEY_SECRET ? 'SET' : 'NOT SET');

// Create facilitator config with CDP authentication
const facilitatorConfig = createFacilitatorConfig(
  process.env.CDP_API_KEY_ID!,
  process.env.CDP_API_KEY_SECRET!
);

const x402Middleware = paymentMiddleware(
  RECIPIENT_ADDRESS,
  x402RoutesConfig,
  facilitatorConfig
);

export async function middleware(request: NextRequest) {
  console.log('[Middleware] Intercepted request:', request.url);
  console.log('[Middleware] Has X-Payment header:', request.headers.has('x-payment'));

  if (request.headers.has('x-payment')) {
    const paymentHeader = request.headers.get('x-payment');
    console.log('[Middleware] Payment header length:', paymentHeader?.length);
    console.log('[Middleware] Payment header preview:', paymentHeader?.substring(0, 100));
  }

  try {
    const result = await x402Middleware(request);

    console.log('[Middleware] Response status:', result.status);

    if (result.status === 402) {
      const responseText = await result.clone().text();
      console.log('[Middleware] 402 response body:', responseText);
    }

    return result;
  } catch (error: any) {
    console.error('[Middleware] Error in x402Middleware:', error);
    console.error('[Middleware] Error message:', error.message);
    console.error('[Middleware] Error stack:', error.stack);
    throw error;
  }
}

// Configure which paths the middleware should run on
// Must use glob pattern, not Express-style :param
export const config = {
  matcher: '/api/x402/(.*)',
  runtime: 'nodejs',
};
