-- Migration: Add USDC forwarding tracking to questions table
-- Run this in Supabase SQL Editor if you have existing questions

-- Add new columns for USDC forwarding tracking
ALTER TABLE questions
ADD COLUMN IF NOT EXISTS usdc_forwarded BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS usdc_forwarded_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS usdc_tx_hash TEXT;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_questions_usdc_forwarded ON questions(usdc_forwarded);

-- For existing correct answers that weren't forwarded, mark them as needing manual sweep
-- (Admin can use /api/admin/sweep to forward accumulated USDC)
UPDATE questions
SET usdc_forwarded = FALSE
WHERE is_correct = TRUE
  AND answered = TRUE
  AND usdc_forwarded IS NULL;

-- Add comment
COMMENT ON COLUMN questions.usdc_forwarded IS 'Tracks if 1.00 USDC was forwarded to contract for this question';
COMMENT ON COLUMN questions.usdc_tx_hash IS 'Transaction hash of USDC transfer to contract';
