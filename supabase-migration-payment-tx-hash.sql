-- Migration: Update questions table to store payment tx hash on creation
-- Run this in Supabase SQL Editor

-- STEP 1: Drop old columns (usdc_forwarded tracking - no longer needed)
ALTER TABLE questions
DROP COLUMN IF EXISTS usdc_forwarded,
DROP COLUMN IF EXISTS usdc_forwarded_at,
DROP COLUMN IF EXISTS usdc_tx_hash;

-- STEP 2: Add new payment_tx_hash column (temporarily nullable for migration)
ALTER TABLE questions
ADD COLUMN IF NOT EXISTS payment_tx_hash TEXT;

-- STEP 3: For existing questions without payment_tx_hash, generate a placeholder
-- These questions were from the old flow and never had USDC forwarded
-- Admin should sweep accumulated USDC using /api/admin/sweep
UPDATE questions
SET payment_tx_hash = '0x0000000000000000000000000000000000000000000000000000000000000000'
WHERE payment_tx_hash IS NULL;

-- STEP 4: Make payment_tx_hash NOT NULL (after backfilling)
ALTER TABLE questions
ALTER COLUMN payment_tx_hash SET NOT NULL;

-- STEP 5: Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_questions_payment_tx_hash ON questions(payment_tx_hash);

-- STEP 6: Add comment
COMMENT ON COLUMN questions.payment_tx_hash IS 'USDC transfer tx hash (forwarded when question was created)';

-- STEP 7: Verify migration
-- Run this to check the migration worked:
-- SELECT id, user_id, payment_tx_hash, answered, is_correct, minted FROM questions ORDER BY created_at DESC LIMIT 10;
