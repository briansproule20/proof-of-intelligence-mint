# Quick Start - LLM Question Generation

## What Changed?

Your app now generates questions using **GPT-4o** with **x402 crypto payments** instead of hardcoded mock questions.

## To Test Immediately (Without CDP Setup)

```bash
pnpm dev
```

Visit http://localhost:3000/play - you'll see a mock fallback question. This proves the integration works!

## To Use Real LLM Questions

### 1. Get CDP Credentials

Visit: https://portal.cdp.coinbase.com/

Create:
- API Key (get ID + Secret)
- MPC Wallet (get Wallet Secret + Owner Name)
- Fund wallet with USDC or ETH

**Detailed instructions:** See `CDP_SETUP_GUIDE.md`

### 2. Add to `.env.local`

```bash
cp apps/web/.env.example apps/web/.env.local
```

Edit `apps/web/.env.local`:

```env
CDP_API_KEY_ID=your_actual_key_id
CDP_API_KEY_SECRET=your_actual_key_secret
CDP_WALLET_SECRET=your_actual_wallet_secret
CDP_WALLET_OWNER=your_wallet_name
```

### 3. Restart Server

```bash
pnpm dev
```

### 4. Test!

Open http://localhost:3000/play and you'll get a real LLM-generated question!

## Cost

~$0.001-0.005 per question with GPT-4o. Fund your CDP wallet with $10-20 USDC for testing.

## Files Added

- `apps/web/lib/question-generator.ts` - LLM integration
- `apps/web/lib/question-cache.ts` - Answer storage
- `CDP_SETUP_GUIDE.md` - Detailed setup
- `LLM_INTEGRATION_SUMMARY.md` - Technical details

## Files Modified

- `apps/web/lib/echo.ts` - Now uses LLM
- `apps/web/.env.example` - Added CDP variables
- `apps/web/package.json` - Added x402 dependencies

## Support

Check console logs for debugging:
- `[QuestionGenerator]` - LLM events
- `[EchoClient]` - API flow
- `[QuestionCache]` - Cache ops

## Next Steps

1. Get CDP credentials
2. Test LLM generation
3. Read `LLM_INTEGRATION_SUMMARY.md` for production considerations

---

Questions? Check the detailed docs or console logs!
