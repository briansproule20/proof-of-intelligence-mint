import { NextRequest, NextResponse } from 'next/server';
import { echoClient } from '@/lib/echo';
import { QuestionResponse, QUESTION_MINT_FEE } from '@poim/shared';
import { CONTRACT_ADDRESS } from '@/lib/contract';

/**
 * GET /api/question
 *
 * Returns a question if user has credits, or 402 Payment Required
 * Following HTTP 402 pattern for monetization
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId') || 'anonymous';

    // Check if user has payment/credits
    // In production, check user's question credits from Echo or payment history
    const hasCredits = await checkUserCredits(userId);

    if (!hasCredits) {
      // Return 402 Payment Required with payment info
      const response: QuestionResponse = {
        requiresPayment: true,
        paymentAmount: QUESTION_MINT_FEE, // 1 POIC token
        paymentRecipient: CONTRACT_ADDRESS,
        message: 'Payment required to access questions. Mint fee: 1 POIC',
      };

      return NextResponse.json(response, {
        status: 402,
        headers: {
          'Accept-Payment': `amount=${QUESTION_MINT_FEE} recipient=${CONTRACT_ADDRESS}`,
        },
      });
    }

    // User has credits, return question
    const question = await echoClient.getQuestion(userId);

    const response: QuestionResponse = {
      requiresPayment: false,
      question,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching question:', error);
    return NextResponse.json(
      { error: 'Failed to fetch question' },
      { status: 500 }
    );
  }
}

/**
 * Check if user has credits/payment for questions
 * In production, this would check:
 * - Echo credits system
 * - Previous successful mints (POIC balance)
 * - Payment history
 */
async function checkUserCredits(userId: string): Promise<boolean> {
  // TODO: Implement actual credit checking
  // For development, return true to allow free access
  return true;
}
