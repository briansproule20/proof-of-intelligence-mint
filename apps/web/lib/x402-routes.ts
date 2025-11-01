import type { RoutesConfig } from 'x402-next';
import { z } from 'zod';
import { zodToJsonSchema } from './x402-schema';

// Route descriptions for x402 payment metadata
const routeDescriptions = {
  '/api/x402/question':
    'Generate AI-powered trivia question using Claude Sonnet 4.5. Payment goes to LP pool.',
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

// Build x402 routes config
export const x402RoutesConfig: RoutesConfig = {
  '/api/x402/question': {
    price: 1.0, // 1 USDC per question
    network: 'base',
    config: {
      description: routeDescriptions['/api/x402/question'],
      outputSchema: zodToJsonSchema(questionResponseSchema),
      discoverable: true,
    },
  },
};
