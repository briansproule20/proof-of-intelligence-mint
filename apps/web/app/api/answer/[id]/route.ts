import { NextRequest, NextResponse } from 'next/server';
import {
  AnswerRequestSchema,
  AnswerResponse,
  MINT_AMOUNT,
} from '@poim/shared';
import { mintTokens, forwardUsdcToContract } from '@/lib/server-wallet';
import { echoClient } from '@/lib/echo';
import { keccak256, toBytes } from 'viem';

/**
 * POST /api/answer/:id
 *
 * Submit an answer to a question
 *
 * POLYMARKETEER PATTERN IMPLEMENTED:
 * ✅ User already paid 1.25 USDC to server wallet when requesting question
 * ✅ This endpoint just verifies answer and mints tokens if correct
 * ✅ Server forwards the received USDC to LP pool
 *
 * Payment Flow:
 * 1. User paid 1.25 USDC to server wallet via /api/x402/question
 * 2. Server received payment and generated question
 * 3. User answers correctly (this endpoint)
 * 4. Server mints tokens and forwards received USDC to LP pool
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

    // Generate unique bytes32 identifier from questionId + walletAddress
    // This ensures each user can only mint once per question (idempotency)
    const paymentTxHash = request.headers.get('x-payment-tx-hash') ||
                         request.headers.get('x-transaction-hash') ||
                         keccak256(toBytes(`${questionId}-${walletAddress}`));

    console.log('[API Answer] Idempotency key (bytes32):', paymentTxHash);

    // Verify answer via Echo client
    // Using wallet address as userId for now
    const isCorrect = await echoClient.verifyAnswer({
      questionId,
      answer,
      userId: walletAddress
    });

    if (!isCorrect) {
      return NextResponse.json({
        correct: false,
        message: 'Incorrect answer. Try again!',
      } as AnswerResponse);
    }

    // Answer is correct - mint tokens and forward USDC to LP pool
    try {
      // 1. Mint tokens to user (using payment tx hash for idempotency)
      const mintTxHash = await mintTokens(walletAddress, paymentTxHash);
      console.log('[API Answer] Minted tokens, tx:', mintTxHash);

      // 2. Forward 1.00 USDC to POIC contract for LP pool
      // (Server keeps 0.25 USDC for gas fees + LLM costs)
      const forwardTxHash = await forwardUsdcToContract();
      console.log('[API Answer] Forwarded 1.00 USDC to LP pool, tx:', forwardTxHash);

      return NextResponse.json({
        correct: true,
        message: 'Tokens minted successfully! $1.00 forwarded to LP pool.',
        txHash: mintTxHash,
        usdcTxHash: forwardTxHash,
      } as AnswerResponse);
    } catch (error) {
      console.error('[API Answer] Error minting/forwarding:', error);

      // Still return correct answer, but note operation failed
      return NextResponse.json({
        correct: true,
        message: 'Answer correct, but minting failed. Please contact support.',
        error: error instanceof Error ? error.message : 'Unknown error',
      } as AnswerResponse);
    }
  } catch (error) {
    console.error('[API Answer] Error:', error);
    return NextResponse.json(
      {
        correct: false,
        message: 'Internal server error',
      } as AnswerResponse,
      { status: 500 }
    );
  }
}
