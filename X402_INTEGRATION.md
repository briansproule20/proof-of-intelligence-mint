# x402 Payment Integration - Fix Payment Flow

## TLDR: Project Overview

**Proof of Intelligence Mint (POIM)** - Trivia game on Base where users:
1. Pay 1 USDC via x402 to get an AI-generated trivia question
2. Answer correctly → Mint 5000 POIC tokens (ERC-20)
3. Payments accumulate in LP pool → After 100k mints, auto-launch Uniswap V4 pool

**Tech Stack:**
- Next.js 15 (App Router)
- Wagmi v2 + Viem for blockchain
- x402-next for micropayments
- Echo client for AI question generation
- Base Mainnet (Chain ID: 8453)

**Contracts:**
- POIC Token: `0x090f371276219Ffe5642F570210e7EE8BCC13c3D`
- USDC (Base): `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- Server Wallet: `0x32d831cd322EB5DF497A1A640175a874b5372BF8`

---

## Problem: Payment Flow is Backwards

### Current Flow (WRONG ❌)
1. User requests question → **FREE** (`GET /api/question`)
2. User submits answer → **PAID 1 USDC** (`POST /api/answer/:id`)

**Why this is wrong:**
- User already knows if they're right/wrong before paying
- Creates bad UX and potential abuse
- Payment middleware is on the wrong endpoint

### Expected Flow (CORRECT ✅)
1. User requests question → **PAID 1 USDC** (`GET /api/question`)
2. User submits answer → **FREE** (just verify + mint if correct) (`POST /api/answer/:id`)

**Why this is better:**
- User pays upfront for the attempt
- Can't game the system by only paying after knowing answer
- Cleaner UX: one payment per question

---

## Implementation Tasks

### 1. Update Middleware (`apps/web/middleware.ts`)

**Current:**
```typescript
export const middleware = paymentMiddleware(
  SERVER_WALLET,
  {
    '/api/answer/:id': {  // ❌ WRONG
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
  matcher: ['/api/answer/:path*'],  // ❌ WRONG
};
```

**Expected:**
```typescript
export const middleware = paymentMiddleware(
  SERVER_WALLET,
  {
    '/api/question': {  // ✅ CORRECT
      price: MINT_PRICE,
      network: 'base',
      config: {
        description: 'Get AI-generated trivia question - payment for LP pool',
      },
    },
  },
  {
    url: 'https://x402.org/facilitator',
  }
);

export const config = {
  matcher: ['/api/question'],  // ✅ CORRECT
};
```

### 2. Update Question Route (`apps/web/app/api/question/route.ts`)

**Current:**
```typescript
const response: QuestionResponse = {
  requiresPayment: false,  // ❌ Returns free question
  question,
};
```

**Expected:**
The x402 middleware will automatically handle payment validation. If payment succeeds, the route executes normally. If payment fails, x402 returns 402 Payment Required before this code runs.

Update the response to remove `requiresPayment` flag or set it based on middleware context.

### 3. Update Answer Route (`apps/web/app/api/answer/[id]/route.ts`)

**Current:**
```typescript
/**
 * POST /api/answer/:id
 *
 * Flow: User pays 1 USDC → Verify answer → Mint tokens → Forward USDC to contract
 */
```

**Expected:**
```typescript
/**
 * POST /api/answer/:id
 *
 * Flow: Verify answer → Mint tokens if correct (payment already collected at question time)
 */
```

Remove any payment-related logic from this endpoint since payment already happened.

### 4. Frontend Updates (Optional but Recommended)

Update UI messaging in:
- `apps/web/app/page.tsx` - Hero/features sections
- `apps/web/app/play/page.tsx` - Instructions

Change from:
> "Pay 1 USDC to submit your answer"

To:
> "Pay 1 USDC to receive a question"

---

## Testing Checklist

- [ ] Payment required when calling `GET /api/question`
- [ ] Payment NOT required when calling `POST /api/answer/:id`
- [ ] 1 USDC deducted from user wallet when fetching question
- [ ] Server wallet receives USDC payment
- [ ] 5000 POIC minted to user wallet on correct answer
- [ ] No additional payment on answer submission
- [ ] Error handling when user has insufficient USDC
- [ ] x402 payment modal appears at correct time (question request, not answer)

---

## x402 Documentation

Refer to x402-next docs for payment middleware configuration:
- https://x402.org/docs
- https://echo.merit.systems/docs (Echo client already integrated)

---

## Questions?

Contact: @briansproule
Contract deployment: Base Mainnet
Environment: `.env.local` has all required secrets
