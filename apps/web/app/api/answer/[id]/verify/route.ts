import { NextRequest, NextResponse } from 'next/server';
import { AnswerResponse } from '@poim/shared';
import { echoClient } from '@/lib/echo';

/**
 * POST /api/answer/:id/verify
 *
 * Verify an answer to a question (without minting)
 *
 * This endpoint only checks if the answer is correct.
 * If correct, the client should call /api/answer/:id/mint separately to mint tokens.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: questionId } = await params;
    const body = await request.json();

    const { answer } = body;

    if (!answer) {
      return NextResponse.json(
        {
          correct: false,
          message: 'Answer is required',
        } as AnswerResponse,
        { status: 400 }
      );
    }

    console.log('[API Answer Verify] Verifying answer for question:', questionId);

    // Verify answer via Echo client
    // Using questionId as userId for now since we don't require wallet at this stage
    const isCorrect = await echoClient.verifyAnswer({
      questionId,
      answer,
      userId: questionId // Use questionId as a temporary userId
    });

    if (!isCorrect) {
      return NextResponse.json({
        correct: false,
        message: 'Incorrect answer. Try again!',
      } as AnswerResponse);
    }

    console.log('[API Answer Verify] Answer is correct!');

    return NextResponse.json({
      correct: true,
      message: 'Correct! Click the mint button to claim your tokens.',
    } as AnswerResponse);
  } catch (error) {
    console.error('[API Answer Verify] Error:', error);
    return NextResponse.json(
      {
        correct: false,
        message: 'Internal server error',
      } as AnswerResponse,
      { status: 500 }
    );
  }
}
