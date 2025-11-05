-- Create questions table for secure answer verification
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  category TEXT,
  user_id TEXT NOT NULL,
  answered BOOLEAN DEFAULT FALSE,
  answered_at TIMESTAMP,
  user_answer TEXT,
  is_correct BOOLEAN,
  minted BOOLEAN DEFAULT FALSE,
  minted_at TIMESTAMP,
  mint_tx_hash TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX idx_questions_user_id ON questions(user_id);
CREATE INDEX idx_questions_answered ON questions(answered);
CREATE INDEX idx_questions_created_at ON questions(created_at);

-- Enable Row Level Security
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Policy: Allow read access (we filter correct_answer in app code)
CREATE POLICY "Allow read access" ON questions
  FOR SELECT
  USING (true);
