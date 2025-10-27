import { NextRequest, NextResponse } from 'next/server';
import {
  VerifyAnswerRequestSchema,
  VerifyAnswerResponse,
  MINT_AMOUNT,
} from '@poim/shared';
import { echoClient } from '@/lib/echo';
import { generateMintSignature, getNextNonce } from '@/lib/signature';
import { CONTRACT_ADDRESS, CHAIN_ID } from '@/lib/contract';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request
    const validationResult = VerifyAnswerRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
        } as VerifyAnswerResponse,
        { status: 400 }
      );
    }

    const { questionId, answer, walletAddress } = validationResult.data;

    // TODO: Get userId from session/auth
    // For now, using wallet address as userId
    const userId = walletAddress;

    // Verify answer with Echo
    const isCorrect = await echoClient.verifyAnswer({
      questionId,
      answer,
      userId,
    });

    if (!isCorrect) {
      return NextResponse.json(
        {
          success: false,
          error: 'Incorrect answer',
        } as VerifyAnswerResponse,
        { status: 200 }
      );
    }

    // Generate mint signature
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
      success: true,
      mintSignature: {
        signature,
        permit,
      },
    } as VerifyAnswerResponse);
  } catch (error) {
    console.error('Error verifying answer:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      } as VerifyAnswerResponse,
      { status: 500 }
    );
  }
}
