import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import type { EchoQuestion } from '@poim/shared';


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
  private openai: ReturnType<typeof createOpenAI> | null = null;
  private initialized = false;
  private failureCount = 0;
  private readonly MAX_FAILURES = 3; // Circuit breaker: stop after 3 failures

  /**
   * Initialize the Echo OpenAI provider with API key
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const apiKey = process.env.ECHO_API_KEY;

    if (!apiKey) {
      throw new Error('Missing ECHO_API_KEY environment variable');
    }

    try {
      // Create OpenAI client pointing to Echo router
      this.openai = createOpenAI({
        apiKey,
        baseURL: 'https://echo.router.merit.systems',
      });

      this.initialized = true;

      console.log('[QuestionGenerator] Successfully initialized with Echo API key mode');
      console.log('[QuestionGenerator] Using Echo router for faster question generation');
    } catch (error) {
      console.error('[QuestionGenerator] Initialization failed:', error);
      throw new Error(
        'Failed to initialize Echo OpenAI client. Please check ECHO_API_KEY in .env.local'
      );
    }
  }

  /**
   * Generate a trivia question using Claude Sonnet 4.5 via x402
   */
  async generateQuestion(
    userId: string,
    difficulty: 'easy' | 'medium' | 'hard' = 'easy'
  ): Promise<EchoQuestion> {
    // Circuit breaker: stop after too many failures
    if (this.failureCount >= this.MAX_FAILURES) {
      throw new Error(
        `Circuit breaker activated: ${this.failureCount} consecutive failures. ` +
        'Please check wallet funds and Echo configuration before retrying.'
      );
    }

    // Ensure initialized
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.openai) {
      throw new Error('OpenAI provider not initialized');
    }

    const difficultyConfig = DIFFICULTY_CONFIGS[difficulty];

    // Create the prompt for question generation
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

    try {
      console.log(`[QuestionGenerator] Generating ${difficulty} question for user ${userId}...`);
      console.log('[QuestionGenerator] Prompt:', prompt.substring(0, 200) + '...');

      // Generate text using Echo API key mode (much faster than x402!)
      console.log('[QuestionGenerator] Calling generateText with Echo API key...');
      const startTime = Date.now();

      const { text } = await generateText({
        model: this.openai!('claude-sonnet-4-20250514'),
        prompt,
        temperature: 0.8, // Add some creativity
        maxTokens: 500,
      });

      const duration = Date.now() - startTime;
      console.log(`[QuestionGenerator] generateText completed in ${duration}ms`);
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
      } as any;

      console.log('[QuestionGenerator] Successfully generated question:', question.id);

      // Reset failure count on success
      this.failureCount = 0;

      return question;
    } catch (error) {
      // Increment failure count
      this.failureCount++;

      console.error(`[QuestionGenerator] Failed to generate question (failure #${this.failureCount}):`, error);
      console.error('[QuestionGenerator] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        fullError: JSON.stringify(error, null, 2),
        failureCount: this.failureCount,
        circuitBreakerWillActivateNext: this.failureCount >= this.MAX_FAILURES
      });

      throw error instanceof Error ? error : new Error('Failed to generate question using LLM');
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
