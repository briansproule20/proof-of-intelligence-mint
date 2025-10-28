# LLM Integration with x402 Payments - Implementation Summary

## Overview

Your Proof of Intelligence app now uses **GPT-4o via the x402 payment protocol** to generate trivia questions dynamically. This replaces the hardcoded mock questions with real AI-generated content.

## What Was Implemented

### 1. **Question Generator Service** (`apps/web/lib/question-generator.ts`)
- Uses `@merit-systems/ai-x402` SDK to make LLM calls with crypto payments
- Generates diverse general knowledge trivia questions
- Supports three difficulty levels: easy, medium, hard
- Returns structured questions with 4 multiple-choice options
- Validates LLM responses to ensure proper format

**Key Features:**
- Automatic x402 payment handling (no API keys needed!)
- Retry logic and error handling
- JSON response parsing with validation
- Stores correct answer metadata for verification

### 2. **Question Cache** (`apps/web/lib/question-cache.ts`)
- In-memory cache to store question metadata
- TTL of 10 minutes per question
- Stores correct answers securely on server-side
- Auto-cleanup of expired questions

**Why?** The correct answer must stay on the server to prevent cheating. The cache associates question IDs with their correct answers for verification.

### 3. **Updated Echo Client** (`apps/web/lib/echo.ts`)
- `getQuestion()` now generates questions using LLM
- `verifyAnswer()` uses cached metadata to verify answers
- Graceful fallback to mock questions if LLM fails
- Prevents sending correct answers to the client

### 4. **Environment Setup**
- Added CDP credential variables to `.env.example`
- Created comprehensive setup guide (`CDP_SETUP_GUIDE.md`)

### 5. **Dependencies Installed**
- `@merit-systems/ai-x402` - x402 payment SDK
- `@coinbase/cdp-sdk` - Coinbase Developer Platform SDK
- `ai` - Vercel AI SDK for LLM calls

## How It Works

### Question Generation Flow

```
User requests question
    ↓
GET /api/question?userId=...
    ↓
echoClient.getQuestion(userId, difficulty)
    ↓
QuestionGenerator initializes CDP wallet
    ↓
Generates prompt for GPT-4o
    ↓
x402 SDK makes HTTP 402 request
    ↓
CDP wallet signs payment
    ↓
Request retried with payment signature
    ↓
GPT-4o generates question JSON
    ↓
Parse & validate response
    ↓
Store correct answer in cache
    ↓
Return question (without correct answer) to client
```

### Answer Verification Flow

```
User submits answer
    ↓
POST /api/answer/:id { answer: "..." }
    ↓
echoClient.verifyAnswer({ questionId, answer, userId })
    ↓
Retrieve question from cache
    ↓
Compare user's answer to correct answer
    ↓
Delete question from cache (one-time use)
    ↓
Return true/false
    ↓
If correct: Generate mint signature
If wrong: Return error message
```

## Required Environment Variables

Add these to `apps/web/.env.local`:

```env
# Coinbase Developer Platform (CDP) for x402 AI Payments
CDP_API_KEY_ID=your_cdp_api_key_id
CDP_API_KEY_SECRET=your_cdp_api_key_secret
CDP_WALLET_SECRET=your_cdp_wallet_secret
CDP_WALLET_OWNER=your_wallet_owner_name
```

**Important:** You MUST set up CDP credentials for question generation to work. See `CDP_SETUP_GUIDE.md` for detailed instructions.

## Fallback Behavior

If CDP credentials are missing or LLM calls fail:
- App falls back to mock questions
- Mock question mentions it's a fallback
- Answer verification still works with mock questions
- Console logs warning messages

**Development Tip:** You can test without CDP by checking the console for fallback warnings.

## File Structure

```
apps/web/lib/
├── question-generator.ts   # LLM question generation via x402
├── question-cache.ts       # In-memory cache for answers
└── echo.ts                 # Updated to use LLM questions

apps/web/.env.example       # Updated with CDP variables
CDP_SETUP_GUIDE.md          # Step-by-step CDP setup
LLM_INTEGRATION_SUMMARY.md  # This file
```

## Configuration Options

### Difficulty Levels

You can pass a difficulty level to `getQuestion()`:

```typescript
// In apps/web/app/api/question/route.ts
const question = await echoClient.getQuestion(userId, 'medium'); // or 'hard'
```

**Difficulty Characteristics:**
- `easy` - Simple general knowledge, straightforward facts
- `medium` - Requires thought or specific knowledge
- `hard` - Challenging, requires expertise

### LLM Model

Currently configured to use **GPT-4o**. To change the model, edit `apps/web/lib/question-generator.ts:130`:

```typescript
const { text } = await generateText({
  model: this.openai('gpt-4o-mini'), // Change to gpt-4o-mini or gpt-3.5-turbo
  prompt,
  temperature: 0.8,
  maxTokens: 500,
});
```

### Question Cache TTL

Default: 10 minutes. To change, edit `apps/web/lib/question-cache.ts:8`:

```typescript
private readonly TTL = 10 * 60 * 1000; // 10 minutes in milliseconds
```

## Cost Estimates

With GPT-4o:
- ~$0.001 - $0.005 per question
- 1000 questions ≈ $5-20 USD
- Payments automatically deducted from CDP wallet

**Note:** x402 adds a small routing fee on top of OpenAI's pricing.

## Security Considerations

### ✅ What's Secure
- Correct answers never sent to client
- Server-side verification only
- One-time question use (cached questions deleted after verification)
- CDP credentials stay server-side

### ⚠️ Production Improvements Needed

1. **Replace in-memory cache with Redis or database**
   - Current cache doesn't persist across server restarts
   - Won't work with multiple server instances
   - Recommended: Use Redis with TTL or PostgreSQL

2. **Add rate limiting**
   - Prevent users from generating too many questions
   - Protect against LLM cost abuse

3. **Add question deduplication**
   - Track previously generated questions per user
   - Avoid showing the same question twice

4. **Add monitoring**
   - Track LLM costs
   - Monitor x402 payment success rate
   - Alert on failures

## Testing

### Test Without CDP Credentials
1. Start dev server: `pnpm dev`
2. Open http://localhost:3000/play
3. You'll see the mock fallback question
4. Console will show: "Falling back to mock question"

### Test With CDP Credentials
1. Follow `CDP_SETUP_GUIDE.md` to set up credentials
2. Add credentials to `apps/web/.env.local`
3. Restart dev server: `pnpm dev`
4. Open http://localhost:3000/play
5. You should see an LLM-generated question
6. Console will show: "Generated LLM question: llm_..."

### Verify x402 Payments
1. Check CDP portal: https://portal.cdp.coinbase.com/
2. Navigate to your wallet
3. View transaction history
4. You should see small payments for each question generation

## Troubleshooting

### "Missing required CDP environment variables"
- Check that all 4 CDP variables are in `.env.local`
- Restart the dev server after adding variables

### "Failed to initialize CDP client"
- Verify your API key ID and secret are correct
- Check that your wallet owner name matches the CDP portal

### "Failed to generate question using LLM"
- Check console for detailed error messages
- Verify your CDP wallet has funds (USDC or ETH)
- Check network connectivity

### "Question not found in cache"
- Question may have expired (10 minute TTL)
- User may have refreshed the page with a stale question ID
- In production, increase TTL or use persistent storage

### Questions are always the same
- This is expected during development with low entropy
- LLM uses `temperature: 0.8` for creativity
- Add more context or vary the prompt for more diversity

## Next Steps

### Immediate (Before Production)
1. [ ] Get CDP credentials and test LLM generation
2. [ ] Fund CDP wallet with USDC/ETH
3. [ ] Test end-to-end flow: generate → display → answer → verify

### Recommended (For Production)
1. [ ] Replace in-memory cache with Redis
2. [ ] Add rate limiting (e.g., 10 questions per user per hour)
3. [ ] Implement question deduplication
4. [ ] Add monitoring and cost tracking
5. [ ] Add retry logic for x402 payment failures
6. [ ] Consider question difficulty progression (start easy, get harder)
7. [ ] Add analytics for question performance (% correct per question)

### Optional Enhancements
- [ ] Support custom question categories (history, science, etc.)
- [ ] Add image-based questions
- [ ] Implement adaptive difficulty based on user performance
- [ ] Generate question batches to reduce latency
- [ ] Add question quality scoring and filtering

## Support & Resources

- **x402 SDK Docs:** https://www.npmjs.com/package/@merit-systems/ai-x402
- **Echo Router:** https://echo.merit.systems/docs/x402
- **CDP Portal:** https://portal.cdp.coinbase.com/
- **CDP Documentation:** https://docs.cdp.coinbase.com/
- **Vercel AI SDK:** https://sdk.vercel.ai/docs

## Questions?

Check the console logs for detailed debugging information. All components log with prefixes:
- `[QuestionGenerator]` - LLM generation events
- `[EchoClient]` - Question/answer flow
- `[QuestionCache]` - Cache operations

---

**Last Updated:** 2025-10-28
**Integration Status:** ✅ Complete (pending CDP credentials)
