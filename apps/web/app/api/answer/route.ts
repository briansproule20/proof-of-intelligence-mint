import { NextRequest, NextResponse } from 'next/server';
import { AnswerResponse } from '@poim/shared';
import { verifyAnswer, markQuestionMinted, canMintQuestion } from '@/lib/supabase';
import { mintTokens, forwardUsdcToContract } from '@/lib/server-wallet';
import { keccak256, toBytes } from 'viem';

/**
 * POST /api/answer
 *
 * Verify answer and mint tokens if correct
 *
 * Body: {
 *   questionId: string,
 *   answer: string,
 *   walletAddress: string
 * }
 *
 * SECURITY:
 * - Question and correct answer stored in Supabase (not exposed to client)
 * - Answer verified server-side against Supabase record
 * - Can only mint once per question (idempotency via Supabase)
 */

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { questionId, answer, walletAddress } = body;

    if (!questionId || !answer) {
      return NextResponse.json(
        {
          correct: false,
          message: 'Question ID and answer are required',
        } as AnswerResponse,
        { status: 400 }
      );
    }

    if (!walletAddress) {
      return NextResponse.json(
        {
          correct: false,
          message: 'Wallet address is required',
        } as AnswerResponse,
        { status: 400 }
      );
    }

    console.log('[API Answer] Verifying answer for question:', questionId);

    // Verify answer against Supabase
    let verificationResult;
    try {
      verificationResult = await verifyAnswer(questionId, answer);
    } catch (error) {
      console.error('[API Answer] Verification failed:', error);
      return NextResponse.json(
        {
          correct: false,
          message: error instanceof Error ? error.message : 'Verification failed',
        } as AnswerResponse,
        { status: 400 }
      );
    }

    if (!verificationResult.correct) {
      console.log('[API Answer] Answer is incorrect');
      return NextResponse.json({
        correct: false,
        message: 'Incorrect answer. Try the next question!',
      } as AnswerResponse);
    }

    console.log('[API Answer] Answer is correct! Proceeding to mint...');

    // Check if already minted
    const canMint = await canMintQuestion(questionId, walletAddress);
    if (!canMint) {
      return NextResponse.json(
        {
          correct: true,
          message: 'Question already minted or invalid',
        } as AnswerResponse,
        { status: 400 }
      );
    }

    // Generate unique bytes32 identifier from questionId + walletAddress
    // This ensures idempotency for the blockchain mint
    const paymentTxHash = keccak256(toBytes(`${questionId}-${walletAddress}`));

    console.log('[API Answer] Minting tokens for question:', questionId);
    console.log('[API Answer] Idempotency key (bytes32):', paymentTxHash);

    // Mint tokens and forward USDC to LP pool
    let mintTxHash: string;

    try {
      // 1. Mint tokens to user (using payment tx hash for idempotency)
      mintTxHash = await mintTokens(walletAddress, paymentTxHash);
      console.log('[API Answer] ✅ Minted tokens, tx:', mintTxHash);

      // Mark as minted in Supabase
      await markQuestionMinted(questionId, mintTxHash);
    } catch (error) {
      console.error('[API Answer] ❌ CRITICAL: Failed to mint tokens:', error);

      // Minting failed - this is critical, inform user
      return NextResponse.json({
        correct: true,
        message: 'Answer correct, but minting failed. Please contact support.',
        error: error instanceof Error ? error.message : 'Unknown error',
      } as AnswerResponse);
    }

    // 2. Forward 1.00 USDC to POIC contract for LP pool (non-blocking)
    // (Server keeps 0.25 USDC for gas fees + LLM costs)
    // If this fails, we still return success to user and log silently
    let usdcTxHash: string | undefined;
    try {
      usdcTxHash = await forwardUsdcToContract();
      console.log('[API Answer] ✅ Forwarded 1.00 USDC to LP pool, tx:', usdcTxHash);
    } catch (error) {
      console.error('[API Answer] ⚠️  USDC forwarding failed (non-critical):', error);
      console.error('[API Answer] Stack:', error instanceof Error ? error.stack : 'No stack trace');
      // Don't fail the request - minting succeeded, USDC can be forwarded later
    }

    return NextResponse.json({
      correct: true,
      message: 'Tokens minted successfully!',
      txHash: mintTxHash,
      usdcTxHash,
    } as AnswerResponse);
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
