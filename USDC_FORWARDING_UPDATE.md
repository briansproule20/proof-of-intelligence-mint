# USDC Forwarding Update

## What Changed

Updated the answer flow to **forward USDC to the contract BEFORE minting**, with database tracking to prevent double-spending.

## Why This Change

**Previous Flow (Bad):**
1. Mint tokens to user ✅
2. Try to forward USDC to contract ⚠️ (could fail silently)

**Problems:**
- If forwarding failed, USDC stayed in server wallet
- No way to track which questions had USDC forwarded
- Could accidentally forward USDC twice if retrying

**New Flow (Good):**
1. **Forward 1.00 USDC to contract** ✅
2. **Mark as forwarded in database** ✅ (prevents double-forwarding)
3. Mint tokens to user ✅
4. Mark as minted in database ✅

**Benefits:**
- USDC is guaranteed in contract before minting
- Database tracks forwarding status (prevents double-spend)
- If forwarding fails, user gets clear error (not silent failure)
- Admin can query which questions need manual forwarding

## Database Changes

### New Columns in `questions` table:

```sql
usdc_forwarded BOOLEAN DEFAULT FALSE
usdc_forwarded_at TIMESTAMP
usdc_tx_hash TEXT
```

### Migration Required

Run this in Supabase SQL Editor:

```bash
# Apply migration
cat supabase-migration-usdc-tracking.sql
```

Or manually run the SQL from `supabase-migration-usdc-tracking.sql`.

## New Functions

### `canForwardUsdc(questionId, userId)`
Checks if USDC can be forwarded for a question:
- Question answered correctly
- USDC not yet forwarded

### `markUsdcForwarded(questionId, usdcTxHash)`
Marks question as having USDC forwarded to contract.

### Updated `canMintQuestion(questionId, userId)`
Now requires `usdc_forwarded === true` before allowing mint.

## API Changes

### POST /api/answer

**New behavior:**
1. Verify answer ✅
2. **Forward USDC (if not already forwarded)** 🆕
3. **Mark as forwarded in DB** 🆕
4. Check if can mint (requires USDC forwarded) 🆕
5. Mint tokens ✅
6. Mark as minted in DB ✅

**New error messages:**
- `"Answer correct, but payment forwarding failed. Please contact support."` - USDC transfer failed
- `"Answer correct and payment received, but minting failed. Please contact support."` - USDC forwarded but mint failed
- `"Question already processed or USDC not yet forwarded"` - Already minted or missing forwarding

## For Existing Questions

If you have existing questions that were answered correctly but USDC wasn't forwarded:

1. Run the migration SQL
2. Use `/api/admin/sweep` to forward accumulated USDC:

```bash
# Check accumulated USDC
curl -H "Authorization: Bearer $ADMIN_API_KEY" \
  https://your-app.vercel.app/api/admin/sweep

# Sweep to contract
curl -X POST -H "Authorization: Bearer $ADMIN_API_KEY" \
  https://your-app.vercel.app/api/admin/sweep
```

## Testing

After deploying:

1. ✅ Answer a question correctly
2. ✅ Check Supabase - `usdc_forwarded` should be `true`
3. ✅ Check contract USDC balance increased by 1.00 USDC
4. ✅ User receives 5000 POIC tokens
5. ✅ Try answering same question again - should get error

## Monitoring

Query Supabase to track forwarding status:

```sql
-- Check forwarding stats
SELECT
  COUNT(*) as total_correct,
  SUM(CASE WHEN usdc_forwarded THEN 1 ELSE 0 END) as forwarded_count,
  SUM(CASE WHEN NOT usdc_forwarded THEN 1 ELSE 0 END) as not_forwarded_count
FROM questions
WHERE is_correct = TRUE;

-- Find questions with USDC not forwarded
SELECT id, user_id, answered_at
FROM questions
WHERE is_correct = TRUE
  AND usdc_forwarded = FALSE
ORDER BY answered_at DESC;
```
