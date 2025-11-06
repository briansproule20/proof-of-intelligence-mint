import { NextRequest, NextResponse } from 'next/server';
import { getQuestionGenerator } from '@/lib/question-generator';
import { hasUserSeenQuestion, markQuestionAsAsked } from '@/lib/question-tracker';
import { storeQuestion } from '@/lib/supabase';
import { forwardUsdcToContract } from '@/lib/server-wallet';

/**
 * GET /api/question
 *
 * Server-side question generation using Echo API key (fast!)
 *
 * PAYMENT FLOW:
 * - Called via /api/x402/question (requires 1.25 USDC payment to server wallet)
 * - x402 middleware validates payment before allowing request through
 * - Server generates question using Echo API key (no blockchain transactions)
 * - Server IMMEDIATELY forwards 1.00 USDC to contract and stores tx hash
 * - Server keeps 0.25 USDC for gas + LLM costs
 *
 * Payment Flow:
 * 1. User pays 1.25 USDC to server wallet via x402 middleware
 * 2. Server generates question using Echo API key
 * 3. Server forwards 1.00 USDC to contract and stores tx hash on question row
 * 4. User answers correctly
 * 5. Server mints tokens using the payment tx hash from question row
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
    const generatedQuestion = await generator.generateQuestion(userId, difficulty);

    // Mark this question as asked to this user
    markQuestionAsAsked(userId, generatedQuestion.question);

    // STEP 1: Forward 1.00 USDC to contract IMMEDIATELY
    // This happens right after question generation, before storing in DB
    console.log('[API Question] Forwarding 1.00 USDC to contract...');
    let paymentTxHash: string;
    try {
      paymentTxHash = await forwardUsdcToContract();
      console.log('[API Question] ✅ Forwarded 1.00 USDC to contract, tx:', paymentTxHash);
    } catch (error) {
      console.error('[API Question] ❌ CRITICAL: Failed to forward USDC:', error);
      return NextResponse.json(
        {
          error: 'Payment forwarding failed',
          message: 'Failed to forward payment to contract. Please contact support.',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }

    // STEP 2: Store question in Supabase with payment tx hash
    const questionId = await storeQuestion({
      questionText: generatedQuestion.question,
      options: generatedQuestion.options,
      correctAnswer: (generatedQuestion as any)._meta.correctAnswer,
      explanation: (generatedQuestion as any)._meta.explanation,
      difficulty: difficulty,
      category: (generatedQuestion as any)._meta.category || 'General Knowledge',
      userId: userId,
      paymentTxHash: paymentTxHash, // Store the USDC transfer tx hash
    });

    console.log('[API Question] ✅ Question stored with payment tx hash:', questionId);

    // Return ONLY the question (NO correct answer or _meta)
    const response = {
      id: questionId,
      question: generatedQuestion.question,
      options: generatedQuestion.options,
      difficulty: difficulty,
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
