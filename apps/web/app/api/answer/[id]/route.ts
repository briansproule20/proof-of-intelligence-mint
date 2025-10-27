import { NextRequest, NextResponse } from 'next/server';
import {
  AnswerRequestSchema,
  AnswerResponse,
  MINT_AMOUNT,
} from '@poim/shared';
import { echoClient } from '@/lib/echo';
import { generateMintSignature, getNextNonce } from '@/lib/signature';
import { CONTRACT_ADDRESS, CHAIN_ID } from '@/lib/contract';

/**
 * POST /api/answer/:id
 *
 * Submit an answer to a question with payment verification via header
 * The mint fee (paid via POIC token) serves as the access payment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const questionId = params.id;
    const body = await request.json();

    // Validate request
    const validationResult = AnswerRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          correct: false,
          message: 'Invalid request data',
        } as AnswerResponse,
        { status: 400 }
      );
    }

    const { answer, walletAddress } = validationResult.data;

    // Check Payment header (optional - for future implementation)
    const paymentHeader = request.headers.get('Payment');
    // In production, verify payment transaction here
    // For now, the mint itself serves as the payment mechanism

    // Verify answer with Echo
    const isCorrect = await echoClient.verifyAnswer({
      questionId,
      answer,
      userId: walletAddress, // Using wallet as userId for simplicity
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
