'use client';

import { createX402OpenAI } from '@merit-systems/ai-x402/server';
import { generateText } from 'ai';
import type { EchoQuestion } from '@poim/shared';
import type { WalletClient } from 'viem';

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

/**
 * Generate a trivia question using the user's wallet to pay via x402
 * This runs CLIENT-SIDE so the user pays for the AI call
 */
export async function generateQuestionWithUserWallet(
  walletClient: WalletClient,
  difficulty: 'easy' | 'medium' | 'hard' = 'easy'
): Promise<EchoQuestion> {
  const difficultyConfig = DIFFICULTY_CONFIGS[difficulty];

  // Use x402 SDK - it will handle payment flow automatically
  console.log('[ClientQuestionGenerator] Creating x402 OpenAI provider with wallet...');
  console.log('[ClientQuestionGenerator] Wallet has signTypedData?', typeof walletClient.signTypedData);
  console.log('[ClientQuestionGenerator] Wallet has signMessage?', typeof walletClient.signMessage);

  if (!walletClient.account) {
    throw new Error('Wallet client must have an account');
  }

  const openai = createX402OpenAI(walletClient as any);

  const prompt = `Generate a single multiple-choice trivia question for a blockchain-based intelligence game.

Difficulty Level: ${difficulty.toUpperCase()}
Difficulty Description: ${difficultyConfig.description}
Complexity: ${difficultyConfig.complexity}

Requirements:
- Generate a ${difficulty} difficulty general knowledge question
- Question should be clear, unambiguous, and interesting
- Provide exactly 4 answer options (A, B, C, D)
- Exactly ONE answer must be correct
- The other 3 answers should be plausible but incorrect
- Topics can include: history, science, geography, culture, arts, sports, technology, nature, etc.
- Avoid overly obscure or niche topics unless difficulty is hard
- Question should be appropriate for a global audience

Response Format (JSON only, no markdown):
{
  "question": "Your question text here?",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": "The exact text of the correct option",
  "explanation": "Brief explanation of why this is correct"
}

Generate the question now:`;

  try {
    console.log('[ClientQuestionGenerator] Generating question with user wallet...');
    console.log('[ClientQuestionGenerator] Wallet client:', walletClient);
    console.log('[ClientQuestionGenerator] Wallet account:', walletClient.account);

    // Generate text using x402 - user's wallet will sign payment
    const { text } = await generateText({
      model: openai('gpt-4o'),
      prompt,
      temperature: 0.8,
      maxOutputTokens: 500,
    });

    console.log('[ClientQuestionGenerator] Successfully generated question');

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

    // Create the EchoQuestion object with metadata
    const question: EchoQuestion & { _meta?: any } = {
      id: `llm_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      question: parsed.question,
      options: parsed.options,
      difficulty,
      _meta: {
        correctAnswer: parsed.correctAnswer,
        explanation: parsed.explanation || 'No explanation provided',
        generatedAt: new Date().toISOString(),
      },
    };

    return question;
  } catch (error) {
    console.error('[ClientQuestionGenerator] Failed to generate question:', error);
    throw new Error('Failed to generate question using LLM');
  }
}
