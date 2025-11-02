import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { anthropic } from '@/lib/echo-sdk';
import type { EchoQuestion } from '@poim/shared';

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

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId') || 'anonymous';
    const difficulty = (request.nextUrl.searchParams.get('difficulty') || 'medium') as 'easy' | 'medium' | 'hard';

    console.log(`[API Question] Generating question for user ${userId}, difficulty: ${difficulty}`);

    const difficultyConfig = DIFFICULTY_CONFIGS[difficulty];

    const prompt = `Generate a single multiple-choice trivia question.

Difficulty Level: ${difficulty.toUpperCase()}
Difficulty Description: ${difficultyConfig.description}
Complexity: ${difficultyConfig.complexity}

CRITICAL RULES:
  - Provide EXACTLY 4 answer options (A, B, C, D in that order)
  - Exactly ONE answer must be correct
  - NEVER include the answer within the question prompt itself
  - Use clear phrasing; avoid double negatives
  - All questions must be factually accurate
  - Vary topics across different categories (history, science, geography, culture, arts, sports, technology, nature, etc.)

Requirements:
- Generate a ${difficulty} difficulty general knowledge trivia question
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

    // Generate question using server's Echo/Anthropic credits
    const { text } = await generateText({
      model: anthropic('claude-sonnet-4-5-20250929'),
      prompt,
      temperature: 0.8,
      maxOutputTokens: 500,
    });

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
      throw new Error('Invalid question format: missing or invalid question field');
    }
    if (!Array.isArray(parsed.options) || parsed.options.length !== 4) {
      throw new Error('Invalid question format: options must be an array of 4 strings');
    }
    if (!parsed.correctAnswer || typeof parsed.correctAnswer !== 'string') {
      throw new Error('Invalid question format: missing or invalid correctAnswer field');
    }
    if (!parsed.options.includes(parsed.correctAnswer)) {
      throw new Error('Invalid question format: correctAnswer must be one of the options');
    }

    // Create the question object
    const question: EchoQuestion = {
      id: `q_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      question: parsed.question,
      options: parsed.options,
      difficulty,
    };

    // Store the question with correct answer for later verification
    // We'll use an in-memory store or database
    // For now, we'll return it in the response and expect the client to send it back
    const response = {
      question,
      _meta: {
        correctAnswer: parsed.correctAnswer,
        explanation: parsed.explanation || 'No explanation provided',
      },
    };

    console.log('[API Question] Successfully generated question:', question.id);

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API Question] Error generating question:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate question',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
