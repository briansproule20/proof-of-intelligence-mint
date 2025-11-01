import { NextRequest, NextResponse } from 'next/server';
import { echoClient } from '@/lib/echo';
import { QuestionResponse } from '@poim/shared';

/**
 * GET /api/question
 *
 * Returns a question generated via Echo API
 *
 * TODO: Move x402 payment HERE (not on answer submission)
 * EXPECTED FLOW:
 * 1. User pays 1 USDC via x402 → Receives question
 * 2. User submits answer → Receives 5000 POIC if correct (no additional payment)
 *
 * This makes more sense because:
 * - Users pay upfront for the chance to answer
 * - Payment happens before they know if they're right/wrong
 * - Cleaner UX: pay once per question attempt
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId') || 'anonymous';
    const difficulty = (request.nextUrl.searchParams.get('difficulty') || 'easy') as 'easy' | 'medium' | 'hard';

    console.log(`[API] Fetching question for user ${userId}, difficulty: ${difficulty}`);

    // Get question from Echo client (uses LLM via x402)
    const question = await echoClient.getQuestion(userId, difficulty);

    const response: QuestionResponse = {
      requiresPayment: false,
      question,
    };

    console.log('[API] Generated question:', question.id);

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API] Error generating question:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate question',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
