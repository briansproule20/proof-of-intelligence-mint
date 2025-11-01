import { paymentMiddleware } from 'x402-next';
import { facilitator } from '@coinbase/x402';
import { x402RoutesConfig } from './lib/x402-routes';

/**
 * x402 Payment Middleware - Polymarketeer Pattern
 *
 * This middleware:
 * 1. Intercepts requests to /api/x402/*
 * 2. Validates payment (1 USDC to server wallet)
 * 3. If payment succeeds, allows request to proceed to the catch-all proxy
 * 4. The proxy forwards to actual /api/* endpoints
 *
 * Pattern from: https://github.com/sragss/polymarketeer
 *
 * Payment flow:
 * - User requests /api/x402/question → Pays 1 USDC → Gets question
 * - User submits answer to /api/answer/:id → FREE (just verify + mint)
 */
const RECIPIENT_ADDRESS = (
  process.env.MINT_SIGNER_ADDRESS || '0x32d831cd322EB5DF497A1A640175a874b5372BF8'
) as `0x${string}`;

export const middleware = paymentMiddleware(
  RECIPIENT_ADDRESS,
  x402RoutesConfig,
  facilitator
);

// Configure which paths the middleware should run on
export const config = {
  matcher: ['/api/x402/:path*'],
  runtime: 'nodejs',
};
