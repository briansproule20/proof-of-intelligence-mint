import { NextRequest, NextResponse } from 'next/server';
import type { EchoQuestion } from '@poim/shared';
import { wrapFetchWithPayment } from 'x402-fetch';
import { privateKeyToAccount } from 'viem/accounts';
import { getRandomCategory } from '@/lib/trivia-categories';
import { hasUserSeenQuestion, markQuestionAsAsked } from '@/lib/question-tracker';

// Server wallet - same wallet that receives user payments via x402
function getServerWallet() {
  const privateKey = process.env.SERVER_WALLET_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('SERVER_WALLET_PRIVATE_KEY not configured');
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  console.log('[API Question] Using server wallet:', account.address);
  return account;
}

/**
 * GET /api/question
 *
 * Server-side question generation using Echo/Anthropic
 *
 * POLYMARKETEER PATTERN:
 * - Called via /api/x402/question (requires 1.25 USDC payment to server wallet)
 * - x402 middleware validates payment before allowing request through
 * - Server generates question using its own Echo credits
 * - Server wallet keeps the received USDC to forward to LP pool later
 *
 * Payment Flow:
 * 1. User pays 1.25 USDC to server wallet via x402 middleware
 * 2. Server receives payment and generates question (server pays for AI)
 * 3. User answers correctly
 * 4. Server mints tokens and forwards the received USDC to LP pool
 */

// Difficulty levels
const DIFFICULTY_CONFIGS = {
  easy: {
    description: 'Simple general knowledge questions suitable for most people',
    complexity: 'straightforward facts',
  },
  medium: {
    description: 'Moderate difficulty requiring some knowledge or reasoning',
    complexity: 'requires thought or specific knowledge',
  },
  hard: {
    description: 'Advanced questions requiring deep knowledge or complex reasoning',
    complexity: 'challenging and requires expertise',
  },
} as const;

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId') || 'anonymous';
    const difficulty = (request.nextUrl.searchParams.get('difficulty') || 'medium') as 'easy' | 'medium' | 'hard';

    console.log(`[API Question] Generating question for user ${userId}, difficulty: ${difficulty}`);
    console.log('[API Question] Echo App ID configured:', !!process.env.ECHO_APP_ID);

    const difficultyConfig = DIFFICULTY_CONFIGS[difficulty];

    // Retry logic: Try up to 10 times to generate a unique question
    const MAX_RETRIES = 10;
    let attempts = 0;
    let generatedQuestion: any = null;
    let selectedCategory: string = '';

    while (attempts < MAX_RETRIES && !generatedQuestion) {
      attempts++;

      // Get a random category for this attempt
      selectedCategory = getRandomCategory();
      console.log(`[API Question] Attempt ${attempts}/${MAX_RETRIES} - Selected category: ${selectedCategory}`);

      const prompt = `Generate a single multiple-choice trivia question specifically about: ${selectedCategory}

Difficulty Level: ${difficulty.toUpperCase()}
Difficulty Description: ${difficultyConfig.description}
Complexity: ${difficultyConfig.complexity}

CRITICAL RULES:
  - Question MUST be about: ${selectedCategory}
  - Provide EXACTLY 4 answer options (A, B, C, D in that order)
  - Exactly ONE answer must be correct
  - NEVER include the answer within the question prompt itself
  - Use clear phrasing; avoid double negatives
  - All questions must be factually accurate
  - Make the question interesting and engaging

Requirements:
- Generate a ${difficulty} difficulty trivia question about ${selectedCategory}
- Question should be clear, unambiguous, and interesting
- The 3 incorrect answers should be plausible but wrong
- Avoid overly obscure or niche topics unless difficulty is hard
- Question should be appropriate for a global audience

Return only the question data in this format:
{
  "question": "Your question text here?",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": "The exact text of the correct option",
  "explanation": "Brief explanation of why this is correct"
}`;

      // Generate question using Echo router via x402 payment
      // Server pays Echo with the same wallet that received user's payment
      console.log('[API Question] Getting server wallet for x402 payment...');
      const wallet = getServerWallet();

      // Wrap fetch with x402 payment handling
      const MAX_PAYMENT = BigInt(10_000_000); // 10 USDC max
      const fetchWithPayment = wrapFetchWithPayment(fetch, wallet as any, MAX_PAYMENT);

      console.log('[API Question] Calling Echo Anthropic API via x402...');

      // Call Echo's Anthropic messages endpoint
      const echoResponse = await fetchWithPayment('https://echo.router.merit.systems/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          ...(process.env.ECHO_APP_ID ? { 'x-echo-app-id': process.env.ECHO_APP_ID } : {}),
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 500,
          temperature: 1.0, // Higher temperature for more variety
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      });

      if (!echoResponse.ok) {
        const errorText = await echoResponse.text();
        console.error('[API Question] Echo API error:', errorText);
        throw new Error(`Echo API error: ${echoResponse.status} ${errorText}`);
      }

      const echoData = await echoResponse.json();
      console.log('[API Question] Echo API response received');

      // Extract text from Anthropic response format
      const text = echoData.content?.[0]?.text || '';

      console.log('[API Question] Generated text from AI');

      // Parse the JSON response
      let cleanedResponse = text.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
      }

      const parsed = JSON.parse(cleanedResponse);

      // Validate structure
      if (!parsed.question || typeof parsed.question !== 'string') {
        console.log('[API Question] Invalid question format, retrying...');
        continue; // Try again with a different category
      }
      if (!Array.isArray(parsed.options) || parsed.options.length !== 4) {
        console.log('[API Question] Invalid options format, retrying...');
        continue;
      }
      if (!parsed.correctAnswer || typeof parsed.correctAnswer !== 'string') {
        console.log('[API Question] Invalid correctAnswer format, retrying...');
        continue;
      }
      if (!parsed.options.includes(parsed.correctAnswer)) {
        console.log('[API Question] correctAnswer not in options, retrying...');
        continue;
      }

      // Check if user has already seen this question
      if (hasUserSeenQuestion(userId, parsed.question)) {
        console.log('[API Question] User has already seen this question, retrying with new category...');
        continue;
      }

      // Question is valid and unique for this user
      generatedQuestion = parsed;
      console.log('[API Question] Successfully generated unique question');
    }

    // If we exhausted all retries without finding a unique question
    if (!generatedQuestion) {
      throw new Error('Could not generate a unique question after multiple attempts. Please try again.');
    }

    // Create the question object
    const question: EchoQuestion = {
      id: `q_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      question: generatedQuestion.question,
      options: generatedQuestion.options,
      difficulty,
    };

    // Mark this question as asked to this user
    markQuestionAsAsked(userId, generatedQuestion.question);

    // Store the question with correct answer for later verification
    // We'll use an in-memory store or database
    // For now, we'll return it in the response and expect the client to send it back
    const response = {
      question,
      _meta: {
        correctAnswer: generatedQuestion.correctAnswer,
        explanation: generatedQuestion.explanation || 'No explanation provided',
        category: selectedCategory, // Include the category used
      },
    };

    console.log('[API Question] Successfully generated question:', question.id);
    console.log('[API Question] Category:', selectedCategory);

    // Disable caching to ensure fresh questions each time
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('[API Question] Error generating question:', error);
    console.error('[API Question] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: 'Failed to generate question',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}
