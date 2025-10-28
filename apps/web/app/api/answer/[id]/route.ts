import { NextRequest, NextResponse } from 'next/server';
import {
  AnswerRequestSchema,
  AnswerResponse,
  MINT_AMOUNT,
} from '@poim/shared';
import { generateMintSignature, getNextNonce } from '@/lib/signature';
import { CONTRACT_ADDRESS, CHAIN_ID } from '@/lib/contract';
import { echoClient } from '@/lib/echo';

/**
 * POST /api/answer/:id
 *
 * Submit an answer to a question
 * Verifies answer via Echo client
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

    // Generate mint signature for correct answer
    const nonce = getNextNonce(walletAddress);
    const amount = BigInt(MINT_AMOUNT);

    const { signature, permit } = await generateMintSignature(
      walletAddress as `0x${string}`,
      amount,
      nonce,
      CONTRACT_ADDRESS,
      CHAIN_ID
    );

    return NextResponse.json({
      correct: true,
      mintSignature: {
        signature,
        permit,
      },
    } as AnswerResponse);
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
