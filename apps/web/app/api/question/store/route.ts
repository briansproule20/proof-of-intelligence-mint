import { NextRequest, NextResponse } from 'next/server';
import { getQuestionCache } from '@/lib/question-cache';

/**
 * POST /api/question/store
 *
 * Store a client-generated question in the server cache
 * This allows the server to verify answers later
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, correctAnswer } = body;

    if (!question || !question.id || !correctAnswer) {
      return NextResponse.json(
        { error: 'Invalid question data' },
        { status: 400 }
      );
    }

    // Store the question in cache for later verification
    const cache = getQuestionCache();
    cache.store(question, correctAnswer);

    console.log('[API Store Question] Stored client-generated question:', question.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API Store Question] Error:', error);
    return NextResponse.json(
      { error: 'Failed to store question' },
      { status: 500 }
    );
  }
}
