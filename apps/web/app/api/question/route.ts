import { NextRequest, NextResponse } from 'next/server';
import { getQuestionGenerator } from '@/lib/question-generator';
import { hasUserSeenQuestion, markQuestionAsAsked } from '@/lib/question-tracker';

/**
 * GET /api/question
 *
 * Server-side question generation using Echo API key (fast!)
 *
 * PAYMENT FLOW:
 * - Called via /api/x402/question (requires 1.25 USDC payment to server wallet)
 * - x402 middleware validates payment before allowing request through
 * - Server generates question using Echo API key (no blockchain transactions)
 * - Server wallet keeps the received USDC to forward to LP pool later
 *
 * Payment Flow:
 * 1. User pays 1.25 USDC to server wallet via x402 middleware
 * 2. Server receives payment and generates question (server uses API key)
 * 3. User answers correctly
 * 4. Server mints tokens and forwards the received USDC to LP pool
 */

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId') || 'anonymous';
    const difficulty = (request.nextUrl.searchParams.get('difficulty') || 'medium') as 'easy' | 'medium' | 'hard';

    console.log(`[API Question] Generating question for user ${userId}, difficulty: ${difficulty}`);
    console.log('[API Question] Using Echo API key mode for fast generation');

    // Use the new QuestionGenerator with Echo API key
    const generator = getQuestionGenerator();
    const question = await generator.generateQuestion(userId, difficulty);

    // Mark this question as asked to this user
    markQuestionAsAsked(userId, question.question);

    console.log('[API Question] Successfully generated question:', question.id);

    // Return the question with metadata
    const response = {
      question: {
        id: question.id,
        question: question.question,
        options: question.options,
        difficulty: question.difficulty,
      },
      _meta: (question as any)._meta,
    };

    // Disable caching to ensure fresh questions each time
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('[API Question] Error generating question:', error);
    console.error('[API Question] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: 'Failed to generate question',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}
