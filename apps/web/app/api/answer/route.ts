import { NextRequest, NextResponse } from 'next/server';
import { AnswerResponse } from '@poim/shared';
import { verifyAnswer, markQuestionMinted, canMintQuestion, getQuestion } from '@/lib/supabase';
import { mintTokens } from '@/lib/server-wallet';

/**
 * POST /api/answer
 *
 * Verify answer and mint tokens if correct
 *
 * Body: {
 *   questionId: string,
 *   answer: string
 * }
 *
 * SECURITY & PAYMENT FLOW:
 * - Question and correct answer stored in Supabase (not exposed to client)
 * - Answer verified server-side against Supabase record
 * - Wallet address retrieved from question.user_id (prevents answer stealing)
 * - USDC was already forwarded to contract when question was created
 * - Payment tx hash stored on question row (used for minting)
 * - Can only mint once per question (idempotency via Supabase + blockchain)
 */

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    // Try to get data from body first, then fall back to query params
    let questionId: string | null = null;
    let answer: string | null = null;

    try {
      const body = await request.json();
      questionId = body.questionId;
      answer = body.answer;
    } catch (e) {
      // Body parsing failed, check query params
      console.log('[API Answer] No JSON body, checking query params');
    }

    // Fallback to query params if not in body
    if (!questionId || !answer) {
      questionId = request.nextUrl.searchParams.get('questionId');
      answer = request.nextUrl.searchParams.get('answer');
      console.log('[API Answer] Using query params:', { questionId, answer });
    }

    if (!questionId || !answer) {
      return NextResponse.json(
        {
          correct: false,
          message: 'Question ID and answer are required',
        } as AnswerResponse,
        { status: 400 }
      );
    }

    console.log('[API Answer] Verifying answer for question:', questionId);

    // SECURITY: Get the question first to retrieve the wallet address
    // This prevents users from stealing other people's questions by changing the wallet address
    const question = await getQuestion(questionId);
    if (!question) {
      return NextResponse.json(
        {
          correct: false,
          message: 'Question not found',
        } as AnswerResponse,
        { status: 404 }
      );
    }

    // Use the wallet address from the question (who paid for it)
    const walletAddress = question.user_id;
    console.log('[API Answer] Minting to question owner:', walletAddress);

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

    // Use the payment_tx_hash from the question row (already fetched above)
    // This was stored when the question was created and USDC was forwarded
    const paymentTxHash = question.payment_tx_hash;
    console.log('[API Answer] Using payment tx hash from question:', paymentTxHash);

    let mintTxHash: string;

    // Check if can mint (answered correctly but not yet minted)
    const canMint = await canMintQuestion(questionId, walletAddress);
    if (!canMint) {
      return NextResponse.json(
        {
          correct: true,
          message: 'Question already minted',
        } as AnswerResponse,
        { status: 400 }
      );
    }

    // Mint tokens to user using the payment tx hash from question creation
    try {
      console.log('[API Answer] Minting tokens for question:', questionId);
      mintTxHash = await mintTokens(walletAddress, paymentTxHash);
      console.log('[API Answer] ✅ Minted tokens, tx:', mintTxHash);

      // Mark as minted in Supabase
      await markQuestionMinted(questionId, mintTxHash);
      console.log('[API Answer] ✅ Marked as minted in database');
    } catch (error) {
      console.error('[API Answer] ❌ CRITICAL: Failed to mint tokens:', error);

      return NextResponse.json({
        correct: true,
        message: 'Answer correct, but minting failed. Please contact support.',
        error: error instanceof Error ? error.message : 'Unknown error',
      } as AnswerResponse);
    }

    return NextResponse.json({
      correct: true,
      message: 'Tokens minted successfully!',
      txHash: mintTxHash,
      usdcTxHash: paymentTxHash, // USDC was forwarded when question was created
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
