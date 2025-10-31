import { NextRequest, NextResponse } from 'next/server';
import {
  AnswerRequestSchema,
  AnswerResponse,
  MINT_AMOUNT,
} from '@poim/shared';
import { mintTokens } from '@/lib/server-wallet';
import { echoClient } from '@/lib/echo';

/**
 * POST /api/answer/:id
 *
 * Submit an answer to a question
 * Verifies answer via Echo client and mints tokens server-side
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: questionId } = await params;
    const body = await request.json();

    const { answer, walletAddress } = body;

    if (!answer || !walletAddress) {
      return NextResponse.json(
        {
          correct: false,
          message: 'Invalid request data',
        } as AnswerResponse,
        { status: 400 }
      );
    }

    // Verify answer via Echo client
    const isCorrect = await echoClient.verifyAnswer({
      questionId,
      answer
    });

    if (!isCorrect) {
      return NextResponse.json({
        correct: false,
        message: 'Incorrect answer. Try again!',
      } as AnswerResponse);
    }

    // Get payment tx hash from x402 header for idempotency
    // In the interim, we'll use questionId + walletAddress as a unique identifier
    const paymentTxHash = `0x${Buffer.from(`${questionId}-${walletAddress}`).toString('hex').padStart(64, '0')}`;

    // Mint tokens server-side
    try {
      const txHash = await mintTokens(walletAddress, paymentTxHash);

      return NextResponse.json({
        correct: true,
        message: 'Tokens minted successfully!',
        txHash,
      } as AnswerResponse);
    } catch (mintError) {
      console.error('Error minting tokens:', mintError);

      // Still return correct answer, but note minting failed
      return NextResponse.json({
        correct: true,
        message: 'Answer correct, but token minting failed. Please contact support.',
      } as AnswerResponse);
    }
  } catch (error) {
    console.error('Error verifying answer:', error);
    return NextResponse.json(
      {
        correct: false,
        message: 'Internal server error',
      } as AnswerResponse,
      { status: 500 }
    );
  }
}
