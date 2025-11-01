import { paymentMiddleware } from 'x402-next';

// x402 payment configuration for POIC minting
// TODO: PAYMENT FLOW NEEDS TO BE FIXED
// CURRENT (WRONG): User pays 1 USDC when submitting answer
// EXPECTED: User pays 1 USDC when requesting question
//
// To fix:
// 1. Remove '/api/answer/:id' from payment routes below
// 2. Add '/api/question' to payment routes
// 3. Update matcher to ['/api/question']
const SERVER_WALLET = (process.env.MINT_SIGNER_ADDRESS || '0x32d831cd322EB5DF497A1A640175a874b5372BF8') as `0x${string}`;
const MINT_PRICE = '$1.00'; // 1 USDC to get a question
const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

export const middleware = paymentMiddleware(
  SERVER_WALLET,
  {
    '/api/answer/:id': {
      price: MINT_PRICE,
      network: 'base',
      config: {
        description: 'Mint 5000 POIC tokens - payment collected for LP pool',
      },
    },
  },
  {
    url: 'https://x402.org/facilitator',
  }
);

export const config = {
  matcher: ['/api/answer/:path*'],
};
