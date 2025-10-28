import { createX402OpenAI } from '@merit-systems/ai-x402/server';
import { CdpClient } from '@coinbase/cdp-sdk';
import { generateText } from 'ai';
import type { EchoQuestion } from '@poim/shared';
import { createWalletClient, custom } from 'viem';
import { baseSepolia } from 'viem/chains';

// CDP Account to Viem WalletClient converter
function createCdpWalletClient(cdpAccount: any) {
  // Create a custom transport that uses CDP's signing
  const customTransport = custom({
    async request({ method, params }: any) {
      // For signing requests, use CDP account
      if (method === 'personal_sign') {
        const [message] = params;
        const signature = await cdpAccount.signMessage(message);
        return signature;
      }
      // For other requests, throw - we only need signing for x402
      throw new Error(`Unsupported method: ${method}`);
    },
  });

  // Create viem account from CDP account
  const viemAccount = {
    address: cdpAccount.address as `0x${string}`,
    type: 'local' as const,
    source: 'custom' as const,
    signMessage: async ({ message }: { message: string | { raw: string | Uint8Array } }) => {
      const messageToSign = typeof message === 'string' ? message : message.raw;
      const signature = await cdpAccount.signMessage(messageToSign);
      return signature as `0x${string}`;
    },
    signTransaction: async () => {
      throw new Error('Transaction signing not supported');
    },
    signTypedData: async () => {
      throw new Error('Typed data signing not supported');
    },
  };

  // Create wallet client with CDP account
  return createWalletClient({
    account: viemAccount,
    chain: baseSepolia,
    transport: customTransport,
  });
}

// Difficulty levels with their characteristics
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

export class QuestionGenerator {
  private openai: ReturnType<typeof createX402OpenAI> | null = null;
  private cdpClient: CdpClient | null = null;
  private initialized = false;

  /**
   * Initialize the CDP client and x402 OpenAI provider
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Check for required environment variables
    const requiredEnvVars = [
      'CDP_API_KEY_ID',
      'CDP_API_KEY_SECRET',
      'CDP_WALLET_SECRET',
      'CDP_WALLET_OWNER',
    ];

    const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);
    if (missingVars.length > 0) {
      throw new Error(
        `Missing required CDP environment variables: ${missingVars.join(', ')}\n` +
          'Please see CDP_SETUP_GUIDE.md for setup instructions.'
      );
    }

    try {
      // Initialize CDP client
      this.cdpClient = new CdpClient({
        apiKeyId: process.env.CDP_API_KEY_ID!,
        apiKeySecret: process.env.CDP_API_KEY_SECRET!,
        walletSecret: process.env.CDP_WALLET_SECRET!,
      });

      // Get or create account
      const account = await this.cdpClient.evm.getOrCreateAccount({
        name: process.env.CDP_WALLET_OWNER!,
      });

      // Create viem WalletClient from CDP account
      const walletClient = createCdpWalletClient(account);

      // Initialize x402 OpenAI provider
      this.openai = createX402OpenAI(walletClient);
      this.initialized = true;

      console.log('[QuestionGenerator] Successfully initialized with CDP wallet:', account.address);
      console.log('[QuestionGenerator] Using x402 payments via Echo router');
    } catch (error) {
      console.error('[QuestionGenerator] Initialization failed:', error);
      throw new Error(
        'Failed to initialize CDP client. Please check your credentials in .env.local'
      );
    }
  }

  /**
   * Generate a trivia question using GPT-4o via x402
   */
  async generateQuestion(
    userId: string,
    difficulty: 'easy' | 'medium' | 'hard' = 'easy'
  ): Promise<EchoQuestion> {
    // Ensure initialized
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.openai) {
      throw new Error('OpenAI provider not initialized');
    }

    const difficultyConfig = DIFFICULTY_CONFIGS[difficulty];

    // Create the prompt for question generation
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
      console.log(`[QuestionGenerator] Generating ${difficulty} question for user ${userId}...`);

      // Generate text using x402-powered OpenAI
      const { text } = await generateText({
        model: this.openai('gpt-4o'),
        prompt,
        temperature: 0.8, // Add some creativity
        maxTokens: 500,
      });

      console.log('[QuestionGenerator] Raw LLM response:', text);

      // Parse the JSON response
      const parsed = this.parseQuestionResponse(text);

      // Create the EchoQuestion object
      const question: EchoQuestion = {
        id: `llm_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        question: parsed.question,
        options: parsed.options,
        difficulty,
        // Store the correct answer and explanation in a way we can verify later
        // We'll store this separately in a database or cache in production
        _meta: {
          correctAnswer: parsed.correctAnswer,
          explanation: parsed.explanation,
          userId,
          generatedAt: new Date().toISOString(),
        },
      };

      console.log('[QuestionGenerator] Successfully generated question:', question.id);
      return question;
    } catch (error) {
      console.error('[QuestionGenerator] Failed to generate question:', error);
      throw new Error('Failed to generate question using LLM');
    }
  }

  /**
   * Parse the LLM response into a structured format
   */
  private parseQuestionResponse(response: string): {
    question: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
  } {
    try {
      // Remove markdown code blocks if present
      let cleanedResponse = response.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
      }

      const parsed = JSON.parse(cleanedResponse);

      // Validate the structure
      if (!parsed.question || typeof parsed.question !== 'string') {
        throw new Error('Invalid question format: missing or invalid question field');
      }
      if (!Array.isArray(parsed.options) || parsed.options.length !== 4) {
        throw new Error('Invalid question format: options must be an array of 4 strings');
      }
      if (!parsed.correctAnswer || typeof parsed.correctAnswer !== 'string') {
        throw new Error('Invalid question format: missing or invalid correctAnswer field');
      }

      // Verify correctAnswer is in options
      if (!parsed.options.includes(parsed.correctAnswer)) {
        throw new Error('Invalid question format: correctAnswer must be one of the options');
      }

      return {
        question: parsed.question,
        options: parsed.options,
        correctAnswer: parsed.correctAnswer,
        explanation: parsed.explanation || 'No explanation provided',
      };
    } catch (error) {
      console.error('[QuestionGenerator] Failed to parse LLM response:', error);
      console.error('[QuestionGenerator] Raw response was:', response);
      throw new Error('Failed to parse question from LLM response');
    }
  }

  /**
   * Verify an answer to a generated question
   * In production, you'd want to store the correct answers in a database
   * For now, we'll pass the correct answer through the question metadata
   */
  verifyAnswer(question: EchoQuestion, userAnswer: string): boolean {
    // Access the metadata we stored
    const meta = (question as any)._meta;
    if (!meta || !meta.correctAnswer) {
      console.error('[QuestionGenerator] Cannot verify answer: no metadata found');
      return false;
    }

    const isCorrect = userAnswer === meta.correctAnswer;
    console.log('[QuestionGenerator] Answer verification:', {
      questionId: question.id,
      userAnswer,
      correctAnswer: meta.correctAnswer,
      isCorrect,
    });

    return isCorrect;
  }
}

// Singleton instance
let questionGenerator: QuestionGenerator | null = null;

/**
 * Get the singleton question generator instance
 */
export function getQuestionGenerator(): QuestionGenerator {
  if (!questionGenerator) {
    questionGenerator = new QuestionGenerator();
  }
  return questionGenerator;
}
