import { paymentMiddleware } from 'x402-next';

// TEMPORARY: x402 user payments disabled while we debug smart wallet compatibility
// Backend still pays Echo for AI generation via createX402OpenAI in question-generator.ts
//
// TODO: Re-enable user payments once we resolve:
// 1. Smart wallet (ERC-4337) compatibility with x402 facilitator
// 2. Or switch to EOA-only wallet requirement
//
// User pays $0.70 USDC → Backend wallet → Backend pays Echo ~$0.63 for AI
const RECEIVER_WALLET = process.env.MINT_SIGNER_ADDRESS || '0x32d831cd322EB5DF497A1A640175a874b5372BF8';
const QUESTION_PRICE = '$0.70'; // User pays this to cover Echo AI costs
const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

// Middleware configuration preserved for easy re-enable
export const x402Middleware = paymentMiddleware(
  RECEIVER_WALLET,
  {
    '/api/question': {
      price: QUESTION_PRICE,
      network: 'base',
      config: {
        description: 'AI-generated trivia question - answer correctly to mint POIC!',
        currency: USDC_BASE,
      },
    },
  },
  {
    url: 'https://x402.org/facilitator',
  }
);

// DISABLED: Uncomment to re-enable user payments
// export const middleware = x402Middleware;

export const config = {
  matcher: [], // Empty matcher = middleware disabled
};
