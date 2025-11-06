import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface QuestionRecord {
  id: string;
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string | null;
  user_id: string; // Wallet address
  payment_tx_hash: string; // USDC transfer tx hash (stored on question creation)
  answered: boolean;
  answered_at: string | null;
  user_answer: string | null;
  is_correct: boolean | null;
  minted: boolean;
  minted_at: string | null;
  mint_tx_hash: string | null;
  created_at: string;
}

/**
 * Store a generated question in Supabase with payment tx hash
 */
export async function storeQuestion(data: {
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  userId: string;
  paymentTxHash: string; // USDC transfer tx hash from forwarding
}): Promise<string> {
  const { data: question, error } = await supabase
    .from('questions')
    .insert({
      question_text: data.questionText,
      options: data.options,
      correct_answer: data.correctAnswer,
      explanation: data.explanation,
      difficulty: data.difficulty,
      category: data.category,
      user_id: data.userId,
      payment_tx_hash: data.paymentTxHash,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[Supabase] Failed to store question:', error);
    throw new Error('Failed to store question');
  }

  return question.id;
}

/**
 * Get a question by ID (without exposing correct answer to client)
 */
export async function getQuestion(questionId: string): Promise<QuestionRecord | null> {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('id', questionId)
    .single();

  if (error) {
    console.error('[Supabase] Failed to get question:', error);
    return null;
  }

  return data;
}

/**
 * Verify an answer and mark question as answered
 */
export async function verifyAnswer(
  questionId: string,
  userAnswer: string
): Promise<{ correct: boolean; explanation: string | null }> {
  // Get the question
  const question = await getQuestion(questionId);

  if (!question) {
    throw new Error('Question not found');
  }

  if (question.answered) {
    throw new Error('Question already answered');
  }

  const isCorrect = userAnswer === question.correct_answer;

  // Update question as answered
  const { error } = await supabase
    .from('questions')
    .update({
      answered: true,
      answered_at: new Date().toISOString(),
      user_answer: userAnswer,
      is_correct: isCorrect,
    })
    .eq('id', questionId);

  if (error) {
    console.error('[Supabase] Failed to update question:', error);
    throw new Error('Failed to update question');
  }

  return {
    correct: isCorrect,
    explanation: question.explanation,
  };
}

/**
 * Mark a question as minted
 */
export async function markQuestionMinted(
  questionId: string,
  mintTxHash: string
): Promise<void> {
  const { error } = await supabase
    .from('questions')
    .update({
      minted: true,
      minted_at: new Date().toISOString(),
      mint_tx_hash: mintTxHash,
    })
    .eq('id', questionId);

  if (error) {
    console.error('[Supabase] Failed to mark question as minted:', error);
    throw new Error('Failed to mark question as minted');
  }
}

/**
 * Check if question can be minted (answered correctly but not yet minted)
 */
export async function canMintQuestion(questionId: string): Promise<boolean> {
  const question = await getQuestion(questionId);

  if (!question) {
    return false;
  }

  return (
    question.answered &&
    question.is_correct === true &&
    !question.minted
  );
}
