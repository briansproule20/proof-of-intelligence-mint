# Payment Flow Update: Forward USDC on Question Creation

## Summary

**Changed the payment flow to forward USDC to the contract IMMEDIATELY when a question is created**, not when it's answered. The payment tx hash is stored on the question row and used for minting.

## Why This Change

**Old Flow (Broken):**
```
1. User pays 1.25 USDC → Server wallet
2. Question created and stored in DB
3. User answers correctly
4. Try to forward USDC → ❌ Could fail silently
5. Mint tokens → ✅ Worked
Result: USDC stuck in server wallet
```

**New Flow (Fixed):**
```
1. User pays 1.25 USDC → Server wallet (via x402)
2. Question generated
3. ✅ IMMEDIATELY forward 1.00 USDC → Contract
4. ✅ Store tx hash on question row in DB
5. User answers correctly
6. ✅ Use tx hash from question row for minting
Result: USDC guaranteed in contract before minting
```

## Database Changes

### New Schema:

```sql
CREATE TABLE questions (
  id UUID PRIMARY KEY,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  difficulty TEXT,
  category TEXT,
  user_id TEXT NOT NULL,
  payment_tx_hash TEXT NOT NULL, -- ← NEW: USDC tx hash from creation
  answered BOOLEAN DEFAULT FALSE,
  answered_at TIMESTAMP,
  user_answer TEXT,
  is_correct BOOLEAN,
  minted BOOLEAN DEFAULT FALSE,
  minted_at TIMESTAMP,
  mint_tx_hash TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Removed Columns:
- `usdc_forwarded` (no longer needed - happens on creation)
- `usdc_forwarded_at` (no longer needed)
- `usdc_tx_hash` (replaced by `payment_tx_hash`)

### Added Column:
- `payment_tx_hash` - stores USDC transfer tx hash from question creation

## Migration Required

Run this SQL in Supabase:

```bash
cat supabase-migration-payment-tx-hash.sql
```

This will:
1. Remove old `usdc_forwarded` columns
2. Add `payment_tx_hash` column
3. Backfill existing questions with placeholder value
4. Make column NOT NULL

## API Changes

### GET /api/question

**New Behavior:**
```typescript
1. Generate question
2. ✅ Forward 1.00 USDC to contract
3. ✅ Store payment tx hash in DB
4. Return question to user
```

If forwarding fails, user gets error **before** receiving question.

### POST /api/answer

**New Behavior:**
```typescript
1. Verify answer
2. ✅ Get payment_tx_hash from question row
3. ✅ Use payment_tx_hash for minting
4. Mark as minted
```

No more forwarding in answer endpoint - it already happened!

## Benefits

✅ **USDC is in contract before user even sees the question**
✅ **No silent failures** - forwarding errors block question creation
✅ **Payment tx hash stored once** - no chance of double-forwarding
✅ **Simpler answer flow** - just verify and mint
✅ **Contract balance always accurate** - 1 USDC per question created

## Code Changes

### `/api/question` (Forward USDC on creation)

```typescript
// Generate question
const question = await generator.generateQuestion(userId, difficulty);

// ✅ Forward USDC immediately
const paymentTxHash = await forwardUsdcToContract();

// ✅ Store with tx hash
await storeQuestion({
  ...questionData,
  paymentTxHash, // ← NEW
});
```

### `/api/answer` (Use tx hash from DB)

```typescript
// Get question
const question = await getQuestion(questionId);

// ✅ Use payment tx hash from question row
const paymentTxHash = question.payment_tx_hash;

// Mint with stored tx hash
await mintTokens(walletAddress, paymentTxHash);
```

## For Existing Questions

Questions created before this update have `payment_tx_hash` set to `0x000...000`.

These questions represent USDC that was never forwarded and is sitting in the server wallet.

**To recover this USDC:**

```bash
# Check how much can be swept
curl -H "Authorization: Bearer $ADMIN_API_KEY" \
  https://your-app.vercel.app/api/admin/sweep

# Sweep to contract
curl -X POST -H "Authorization: Bearer $ADMIN_API_KEY" \
  https://your-app.vercel.app/api/admin/sweep
```

## Testing

After deploying:

1. ✅ Create a question (pays 1.25 USDC)
2. ✅ Check contract USDC balance increased by 1.00 USDC
3. ✅ Check Supabase - `payment_tx_hash` should be set
4. ✅ Answer correctly and mint
5. ✅ Check user received 5000 POIC tokens
6. ✅ Try answering same question again - should fail

## Monitoring

Query Supabase to verify:

```sql
-- Check recent questions with payment tx hashes
SELECT
  id,
  user_id,
  payment_tx_hash,
  answered,
  is_correct,
  minted,
  created_at
FROM questions
ORDER BY created_at DESC
LIMIT 10;

-- Count questions with placeholder tx hash (old questions)
SELECT COUNT(*) as old_questions
FROM questions
WHERE payment_tx_hash = '0x0000000000000000000000000000000000000000000000000000000000000000';

-- Count questions with real tx hash (new flow)
SELECT COUNT(*) as new_questions
FROM questions
WHERE payment_tx_hash != '0x0000000000000000000000000000000000000000000000000000000000000000';
```

## Rollback Plan

If something goes wrong:

1. Revert to previous commit
2. Re-run old migration SQL
3. Sweep accumulated USDC manually

Existing questions with placeholder tx hashes can still be minted - the contract uses tx hashes for idempotency checking.
