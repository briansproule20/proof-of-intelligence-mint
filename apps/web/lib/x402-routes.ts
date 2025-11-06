import type { RoutesConfig } from 'x402-next';
import { z } from 'zod';
import { zodToJsonSchema } from './x402-schema';

// Route descriptions for x402 payment metadata
const routeDescriptions = {
  'GET /api/x402/question':
    'Generate AI-powered trivia question using Claude Sonnet 4.5. Payment goes to LP pool.',
  'POST /api/x402/answer':
    'Submit answer to trivia question and mint POIC tokens if correct. Minimal payment for x402scan visibility.',
} as const;

// Input schema - no query parameters needed for question generation
const questionInputSchema = z.object({
  // Question generation doesn't require input parameters
  // The AI will generate a random trivia question
});

// Output schema - the question response
const questionResponseSchema = z.object({
  id: z.string(),
  question: z.string(),
  options: z.array(z.string()),
  correctAnswer: z.string(),
  category: z.string().optional(),
  difficulty: z.string().optional(),
  timestamp: z.number(),
});

// Input schema for answer submission
const answerInputSchema = z.object({
  questionId: z.string(),
  answer: z.string(),
  walletAddress: z.string(),
});

// Output schema - the answer response
const answerResponseSchema = z.object({
  correct: z.boolean(),
  message: z.string(),
  txHash: z.string().optional(),
  usdcTxHash: z.string().optional(),
  error: z.string().optional(),
});

// Build x402 routes config
export const x402RoutesConfig: RoutesConfig = {
  'GET /api/x402/question': {
    price: 1.25, // 1.25 USDC per question
    network: 'base',
    config: {
      description: routeDescriptions['GET /api/x402/question'],
      discoverable: true,
    },
  },
  'POST /api/x402/answer': {
    price: 0.001, // 10x increase for x402scan visibility (was 0.0001)
    network: 'base',
    config: {
      description: routeDescriptions['POST /api/x402/answer'],
      discoverable: true,
    },
  },
};
