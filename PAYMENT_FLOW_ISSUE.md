# Payment Flow Architecture Issue

## Current State

The application has a **broken payment flow** that needs to be fixed before deployment.

### What's Broken

**Current Implementation:**
1. User pays 1 USDC to Echo/x402 for AI question generation (client-side)
2. User answers the question correctly
3. Server wallet pays gas to mint tokens to user
4. Server wallet tries to forward 1 USDC to LP pool **but never received any USDC**

**The Problem:**
- User's payment goes to Echo/x402 service
- Server wallet receives $0
- Server wallet still tries to transfer 1 USDC it doesn't have to LP pool (line 72 in `apps/web/app/api/answer/[id]/route.ts`)
- This will fail or drain the server wallet's own funds

---

## Required Architecture (x402 Polymarketeer Pattern)

The correct flow should follow the [Polymarketeer pattern](https://github.com/sragss/polymarketeer):

### Correct Payment Flow

1. **User requests question** → Makes request to `/api/x402/question`
2. **x402 middleware intercepts** → Requires 1 USDC payment to SERVER WALLET
3. **User signs payment** → Pays 1 USDC to server wallet address
4. **Middleware validates** → Confirms payment received
5. **Server generates question** → Server pays for AI generation using its own Echo credits
6. **User answers correctly** → Submits answer to `/api/answer/:id`
7. **Server mints tokens** → Pays gas to mint tokens
8. **Server forwards USDC** → Transfers the 1 USDC it received to LP pool

### Key Points

- **Server wallet receives the payment upfront** (at question request time)
- **Server wallet controls the USDC** and forwards it to LP pool after correct answer
- **User pays once** (1 USDC at question request)
- **No client-side payment to Echo** (server handles AI costs)

---

## Files That Need Fixing

### 1. `/apps/web/app/play/page.tsx` (Lines 43-87)

**Current (Wrong):**
```typescript
// Use client-side generation - user pays for AI via x402
const generatedQuestion = await generateQuestionWithUserWallet(walletClient, 'medium');
```

**Should Be:**
```typescript
// Call server endpoint which requires x402 payment to SERVER WALLET
const response = await fetch('/api/x402/question?userId=${address}');
```

**Issue:** Currently using client-side AI generation where user pays Echo directly. Should use server endpoint with x402 middleware that collects payment to server wallet.

---

### 2. `/apps/web/middleware.ts` (Lines 19-21)

**Current:**
```typescript
const RECIPIENT_ADDRESS = (
  process.env.MINT_SIGNER_ADDRESS || '0x32d831cd322EB5DF497A1A640175a874b5372BF8'
) as `0x${string}`;
```

**Check:** Make sure this is the server wallet address that needs to receive the 1 USDC payments.

---

### 3. `/apps/web/app/api/x402/[...path]/route.ts`

**Status:** Proxy is set up correctly to forward requests.

**Issue:** The middleware needs to properly validate x402 payments before allowing requests through.

---

### 4. `/apps/web/lib/x402-routes.ts`

**Current:** Correctly configured for 1 USDC payment on Base.

```typescript
'/api/x402/question': {
  price: 1.0, // 1 USDC per question
  network: 'base',
  // ...
}
```

**Status:** Configuration looks correct.

---

### 5. `/apps/web/app/api/answer/[id]/route.ts` (Line 72)

**Current:**
```typescript
// 2. Forward 1 USDC to POIC contract for LP pool
const forwardTxHash = await forwardUsdcToContract();
```

**Issue:** This assumes the server wallet already has the 1 USDC (which it doesn't in current implementation).

**Should Work Once:** x402 middleware is properly collecting payments to server wallet.

---

## Implementation Steps

### Step 1: Remove Client-Side Payment Code

Remove the client-side x402 payment implementation:
- Delete or stop using `generateQuestionWithUserWallet()` in PlayPage
- Remove imports of `client-question-generator.ts`

### Step 2: Implement Proper x402 Fetch

The frontend needs to make requests that trigger the x402 payment flow. Research how to properly use `x402-fetch` npm package or implement the payment protocol:

**Resources:**
- [Polymarketeer example](https://github.com/sragss/polymarketeer)
- [x402 TypeScript examples](https://github.com/coinbase/x402/tree/main/examples/typescript)
- x402 GitBook docs

**Key Question:** How does the client construct the X-PAYMENT header? This is the missing piece.

### Step 3: Update PlayPage to Use Server Endpoint

```typescript
const fetchQuestion = async () => {
  try {
    setIsLoading(true);
    setError('');

    // This should trigger x402 payment flow via middleware
    const response = await fetch(`/api/x402/question?userId=${address}`);

    if (!response.ok) {
      throw new Error('Failed to fetch question');
    }

    const data = await response.json();
    setQuestion(data.question);
    setQuestionId(data.question.id);
  } catch (err) {
    setError(err.message);
  } finally {
    setIsLoading(false);
  }
};
```

### Step 4: Verify Server Wallet Balance

Make sure the server wallet address (`MINT_SIGNER_ADDRESS`) has:
- ETH for gas (minting tokens, forwarding USDC)
- Will receive USDC from users via x402 middleware

### Step 5: Test End-to-End

1. User connects wallet
2. User requests question (pays 1 USDC to server wallet via x402)
3. Server receives payment and generates question
4. User answers correctly
5. Server mints tokens (pays gas)
6. Server forwards received USDC to LP pool

---

## Environment Variables Needed

```bash
# Server wallet that receives payments and mints tokens
MINT_SIGNER_ADDRESS=0x...
SERVER_WALLET_PRIVATE_KEY=0x...

# Echo API for AI generation (server pays for this)
ECHO_APP_ID=...
ECHO_API_KEY=...
```

---

## Critical Questions to Resolve

1. **How does x402-fetch work?** The package is installed but not being used correctly
2. **Does the middleware automatically handle payment collection?** Or does frontend need to construct X-PAYMENT header?
3. **Is there example code from x402 showing client-side integration?**

---

## Current Files Status

### Working Files
- ✅ `/apps/web/middleware.ts` - x402 middleware configured
- ✅ `/apps/web/lib/x402-routes.ts` - Route config correct
- ✅ `/apps/web/app/api/x402/[...path]/route.ts` - Proxy setup
- ✅ `/apps/web/lib/server-wallet.ts` - Mint & forward logic
- ✅ `/apps/web/app/api/answer/[id]/route.ts` - Answer verification

### Broken Files
- ❌ `/apps/web/app/play/page.tsx` - Using wrong payment flow
- ❌ `/apps/web/lib/client-question-generator.ts` - Shouldn't be used

### Files You Created (Can Delete)
- `/apps/web/app/api/question/store/route.ts` - Not needed for server-paid flow

---

## Summary

The core issue: **User pays Echo, but server needs the USDC for LP pool.**

The fix: **User must pay server wallet via x402 middleware, then server handles everything.**

The missing piece: **How to properly implement x402 payment on the client-side** (likely using x402-fetch package or manually constructing X-PAYMENT headers).

---

## References

- [x402 Protocol](https://x402.org)
- [Polymarketeer Reference Implementation](https://github.com/sragss/polymarketeer)
- [x402 GitHub](https://github.com/coinbase/x402)
- [x402 GitBook](https://x402.gitbook.io/x402)
