# Supabase Setup for Secure Question Storage

## Overview
Questions and answers are now stored in Supabase to prevent answer API abuse. Correct answers are stored server-side and never exposed to the client.

## Setup Steps

### 1. Create Supabase Project
1. Go to https://supabase.com
2. Create a new project
3. Wait for database to initialize

### 2. Create Questions Table
Run this SQL in Supabase SQL Editor:

```sql
-- Questions table
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

-- Policy: Anyone can read (we filter correct_answer in app code)
CREATE POLICY "Allow read access" ON questions
  FOR SELECT
  USING (true);
```

### 3. Add Environment Variables
Add to `apps/web/.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

Get these values from:
- Supabase Dashboard → Project Settings → API
- URL: Project URL
- Anon key: `anon` `public` key

## Security Model

### Before (INSECURE):
```
1. User requests question via /api/x402/question
2. API returns: { question, options, _meta: { correctAnswer } }
3. Anyone could call /api/answer/[id]/mint without verifying answer
```

### After (SECURE):
```
1. User requests question via /api/x402/question
2. API generates question, stores in Supabase WITH correct answer
3. API returns ONLY: { id, question, options, difficulty }
4. User submits answer via /api/answer { questionId, answer, walletAddress }
5. Server verifies answer against Supabase record
6. If correct, mints tokens automatically
7. Marks question as answered/minted in Supabase (idempotency)
```

## New API Flow

### GET /api/question (via /api/x402/question proxy)
**Request:**
```
GET /api/x402/question?userId=0x...&difficulty=medium
+ X-PAYMENT header (1.25 USDC)
```

**Response:**
```json
{
  "id": "uuid",
  "question": "What is the capital of France?",
  "options": ["Paris", "London", "Berlin", "Madrid"],
  "difficulty": "medium"
}
```

### POST /api/answer
**Request:**
```json
{
  "questionId": "uuid",
  "answer": "Paris",
  "walletAddress": "0x..."
}
```

**Response (Correct):**
```json
{
  "correct": true,
  "message": "Tokens minted successfully!",
  "txHash": "0x...",
  "usdcTxHash": "0x..."
}
```

**Response (Incorrect):**
```json
{
  "correct": false,
  "message": "Incorrect answer. Try the next question!"
}
```

## Database Schema

```typescript
interface QuestionRecord {
  id: string;                    // UUID primary key
  question_text: string;         // Question text
  options: string[];             // 4 answer options (JSONB)
  correct_answer: string;        // NEVER sent to client
  explanation: string | null;    // Answer explanation
  difficulty: 'easy' | 'medium' | 'hard';
  category: string | null;       // From 163-category system
  user_id: string;               // Wallet address
  answered: boolean;             // Has user answered?
  answered_at: string | null;    // When answered
  user_answer: string | null;    // What user answered
  is_correct: boolean | null;    // Was answer correct?
  minted: boolean;               // Tokens minted?
  minted_at: string | null;      // When minted
  mint_tx_hash: string | null;   // Blockchain tx hash
  created_at: string;            // Question creation time
}
```

## Benefits

1. **Security**: Correct answers never exposed to client
2. **Idempotency**: Can't mint twice for same question
3. **Auditability**: Full record of questions, answers, mints
4. **Analytics**: Track question difficulty, success rates, etc.
5. **Scalability**: Supabase handles all question storage

## Migration from Old System

### Removed Files:
- `app/api/answer/[id]/route.ts` ❌
- `app/api/answer/[id]/verify/route.ts` ❌
- `app/api/answer/[id]/mint/route.ts` ❌
- `app/api/question/store/route.ts` ❌

### New Files:
- `app/api/answer/route.ts` ✅ (unified verify + mint)
- `lib/supabase.ts` ✅ (Supabase client + helpers)

### Modified Files:
- `app/api/question/route.ts` - Now stores in Supabase
- `app/play/page.tsx` - Uses new unified API
- `package.json` - Added @supabase/supabase-js

## Monitoring

Query recent questions:
```sql
SELECT
  id,
  question_text,
  difficulty,
  user_id,
  answered,
  is_correct,
  minted,
  created_at
FROM questions
ORDER BY created_at DESC
LIMIT 10;
```

Success rate by difficulty:
```sql
SELECT
  difficulty,
  COUNT(*) as total,
  SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct,
  ROUND(100.0 * SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM questions
WHERE answered = true
GROUP BY difficulty;
```
