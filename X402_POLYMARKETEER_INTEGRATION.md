# x402 Integration - Polymarketeer Pattern Implementation

## Summary

Successfully implemented the x402 payment integration following the **polymarketeer** pattern from https://github.com/sragss/polymarketeer.

The key change: **Payment happens when requesting a question, not when submitting an answer.**

## Implementation Pattern

### Architecture

```
User Request Flow:
1. User calls /api/x402/question
2. Middleware intercepts and validates 1 USDC payment
3. If payment succeeds, proxy forwards to /api/question
4. Backend generates question using Echo SDK
5. Question returned to user
6. User submits answer to /api/answer/:id (FREE - no payment)
```

### Files Created

#### 1. `apps/web/lib/x402-schema.ts`
Helper utilities to convert Zod schemas to x402 HTTP request structures.

#### 2. `apps/web/lib/x402-routes.ts`
Routes configuration defining all paid endpoints:
- `/api/x402/question` - 1 USDC per question
- Network: Base Mainnet
- Discoverable via x402 protocol

#### 3. `apps/web/lib/echo-sdk.ts`
Echo SDK integration (polymarketeer pattern) - simplified handler for x402-powered AI.

#### 4. `apps/web/app/api/x402/[...path]/route.ts`
Catch-all proxy route that:
- Receives requests to `/api/x402/*` (after payment validation)
- Forwards to actual `/api/*` endpoints
- Returns response to client

### Files Modified

#### 1. `apps/web/package.json`
Added dependencies:
- `@merit-systems/echo-next-sdk`: ^0.0.24
- `@merit-systems/echo-react-sdk`: ^1.0.33
- `x402`: ^0.7.0 (core package)

#### 2. `apps/web/middleware.ts`
Updated to polymarketeer pattern:
```typescript
import { facilitator } from '@coinbase/x402';
import { x402RoutesConfig } from './lib/x402-routes';

export const middleware = paymentMiddleware(
  RECIPIENT_ADDRESS,
  x402RoutesConfig,
  facilitator
);

export const config = {
  matcher: ['/api/x402/:path*'],
  runtime: 'nodejs',
};
```

#### 3. `apps/web/app/providers.tsx`
Added EchoProvider:
```typescript
import { EchoProvider } from '@merit-systems/echo-react-sdk';

<EchoProvider appId={process.env.NEXT_PUBLIC_ECHO_APP_ID || ''}>
  {children}
</EchoProvider>
```

#### 4. `apps/web/app/play/page.tsx`
Updated API call:
- OLD: `fetch('/api/question')`
- NEW: `fetch('/api/x402/question')`

#### 5. `apps/web/.env.local`
Added Echo SDK configuration:
```bash
ECHO_APP_ID=your_echo_app_id_here
NEXT_PUBLIC_ECHO_APP_ID=your_echo_app_id_here
```

## Setup Instructions

### 1. Get Echo App ID

1. Visit https://echo.merit.systems/
2. Create a new Echo app
3. Copy your App ID
4. Update `.env.local`:
   ```bash
   ECHO_APP_ID=<your-app-id>
   NEXT_PUBLIC_ECHO_APP_ID=<your-app-id>
   ```

### 2. Install Dependencies

Dependencies were already installed. If needed:
```bash
pnpm install
```

### 3. Start Development Server

```bash
pnpm dev
```

### 4. Test Payment Flow

1. Connect wallet on `/play` page
2. Ensure wallet has 1+ USDC on Base
3. Click "Get Question" or auto-load on page load
4. x402 payment modal should appear requesting 1 USDC
5. Approve payment
6. Question appears
7. Submit answer (FREE - no additional payment)

## Payment Flow Details

### ✅ CORRECT Flow (Implemented)

| Step | Endpoint | Cost | Description |
|------|----------|------|-------------|
| 1 | `GET /api/x402/question` | 1 USDC | User pays to receive question |
| 2 | `POST /api/answer/:id` | FREE | Verify answer + mint tokens |

### ❌ OLD Flow (Fixed)

| Step | Endpoint | Cost | Description |
|------|----------|------|-------------|
| 1 | `GET /api/question` | FREE | ❌ User gets question without paying |
| 2 | `POST /api/answer/:id` | 1 USDC | ❌ User pays after knowing answer |

## Key Differences from Original Implementation

### Before (Your old implementation)
- Payment middleware on `/api/answer/:id`
- User could see answer before paying
- Created abuse potential

### After (Polymarketeer pattern)
- Payment middleware on `/api/x402/*`
- Separate namespace for paid routes
- Catch-all proxy pattern
- User pays upfront for question attempt
- Cleaner separation of concerns

## Architecture Comparison

### Polymarketeer Pattern (Now Implemented)
```
/api/x402/question → [Middleware: Pay 1 USDC] → [Proxy] → /api/question
/api/answer/:id → [No payment] → Verify + Mint
```

### Direct Pattern (Old)
```
/api/question → [No payment] → Generate question
/api/answer/:id → [Middleware: Pay 1 USDC] → Verify + Mint
```

## Benefits of This Approach

1. **Cleaner Architecture**: Paid routes under `/api/x402/` namespace
2. **Reusable Pattern**: Easy to add more paid endpoints
3. **Standard Compliance**: Follows x402 protocol best practices
4. **Developer Experience**: Clear separation between free and paid routes
5. **Easier Testing**: Can test `/api/question` directly without payment
6. **Scalability**: Centralized route configuration

## Testing Checklist

- [ ] Get Echo App ID and update `.env.local`
- [ ] Start dev server (`pnpm dev`)
- [ ] Connect wallet with USDC on Base
- [ ] Request question from play page
- [ ] x402 payment modal appears
- [ ] Approve 1 USDC payment
- [ ] Question loads successfully
- [ ] Submit answer (no additional payment)
- [ ] Correct answer → 5000 POIC minted
- [ ] Check BaseScan for mint transaction

## Troubleshooting

### Payment modal doesn't appear
- Check that `ECHO_APP_ID` is set in `.env.local`
- Verify wallet has USDC on Base
- Check browser console for errors

### "Failed to fetch question" error
- Ensure server is running
- Check that `/api/question` endpoint works directly
- Verify middleware is configured correctly

### Middleware not intercepting requests
- Check `middleware.ts` matcher: `['/api/x402/:path*']`
- Ensure `facilitator` is imported from `@coinbase/x402`
- Restart dev server after middleware changes

## Next Steps

1. **Get Echo App ID** - Required to test payment flow
2. **Test on testnet first** - Use Base Sepolia before mainnet
3. **Monitor payments** - Check server wallet receives USDC
4. **Add error handling** - Handle payment failures gracefully
5. **Consider rate limiting** - Prevent abuse of paid endpoints

## Resources

- Polymarketeer repo: https://github.com/sragss/polymarketeer
- Echo SDK docs: https://echo.merit.systems/docs
- x402 protocol: https://x402.org/docs
- Merit Systems: https://merit.systems

## Notes

- The old `echo.ts` file was kept for backward compatibility
- New `echo-sdk.ts` follows polymarketeer's simplified pattern
- Both implementations can coexist during migration
- Server-side payment handling remains unchanged
- Only client-side payment flow was updated
