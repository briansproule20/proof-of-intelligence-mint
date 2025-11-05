import { NextRequest, NextResponse } from 'next/server';
import { AnswerResponse, MINT_AMOUNT } from '@poim/shared';
import { mintTokens, forwardUsdcToContract } from '@/lib/server-wallet';
import { keccak256, toBytes } from 'viem';

/**
 * POST /api/answer/:id/mint
 *
 * Mint tokens after correct answer verification
 *
 * POLYMARKETEER PATTERN IMPLEMENTED:
 * ✅ User already paid 1.25 USDC to server wallet when requesting question
 * ✅ User verified answer via /api/answer/:id/verify
 * ✅ This endpoint mints tokens and forwards USDC to LP pool
 *
 * Payment Flow:
 * 1. User paid 1.25 USDC to server wallet via /api/x402/question
 * 2. Server received payment and generated question
 * 3. User answered correctly (verified via /verify endpoint)
 * 4. Server mints tokens and forwards received USDC to LP pool
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: questionId } = await params;
    const body = await request.json();

    const { walletAddress } = body;

    if (!walletAddress) {
      return NextResponse.json(
        {
          correct: true,
          message: 'Wallet address is required',
        } as AnswerResponse,
        { status: 400 }
      );
    }

    // Generate unique bytes32 identifier from questionId + walletAddress
    // This ensures each user can only mint once per question (idempotency)
    const paymentTxHash = request.headers.get('x-payment-tx-hash') ||
                         request.headers.get('x-transaction-hash') ||
                         keccak256(toBytes(`${questionId}-${walletAddress}`));

    console.log('[API Answer Mint] Minting tokens for question:', questionId);
    console.log('[API Answer Mint] Idempotency key (bytes32):', paymentTxHash);

    // Mint tokens and forward USDC to LP pool
    let mintTxHash: string;

    try {
      // 1. Mint tokens to user (using payment tx hash for idempotency)
      mintTxHash = await mintTokens(walletAddress, paymentTxHash);
      console.log('[API Answer Mint] ✅ Minted tokens, tx:', mintTxHash);
    } catch (error) {
      console.error('[API Answer Mint] ❌ CRITICAL: Failed to mint tokens:', error);

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
      console.log('[API Answer Mint] ✅ Forwarded 1.00 USDC to LP pool, tx:', usdcTxHash);
    } catch (error) {
      console.error('[API Answer Mint] ⚠️  USDC forwarding failed (non-critical):', error);
      console.error('[API Answer Mint] Stack:', error instanceof Error ? error.stack : 'No stack trace');
      // Don't fail the request - minting succeeded, USDC can be forwarded later
    }

    return NextResponse.json({
      correct: true,
      message: 'Tokens minted successfully!',
      txHash: mintTxHash,
      usdcTxHash,
    } as AnswerResponse);
  } catch (error) {
    console.error('[API Answer Mint] Error:', error);
    return NextResponse.json(
      {
        correct: true,
        message: 'Internal server error',
      } as AnswerResponse,
      { status: 500 }
    );
  }
}
