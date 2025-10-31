import { paymentMiddleware } from 'x402-next';

// x402 payment configuration for POIC minting
// User pays 1 USDC → Server wallet → Server forwards to POIC contract → Mints 5000 POIC
const SERVER_WALLET = process.env.MINT_SIGNER_ADDRESS || '0x32d831cd322EB5DF497A1A640175a874b5372BF8';
const MINT_PRICE = '$1.00'; // 1 USDC to mint 5000 POIC (after correct answer)
const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

export const middleware = paymentMiddleware(
  SERVER_WALLET,
  {
    '/api/answer/:id': {
      price: MINT_PRICE,
      network: 'base',
      config: {
        description: 'Mint 5000 POIC tokens - payment collected for LP pool',
        currency: USDC_BASE,
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
