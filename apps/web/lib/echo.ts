import { EchoQuestion, EchoAnswerVerification } from '@poim/shared';
import { getQuestionGenerator } from './question-generator';
import { getQuestionCache } from './question-cache';

const ECHO_API_BASE = 'https://api.echo.merit.systems';
const ECHO_API_KEY = process.env.ECHO_API_KEY || '';

export interface EchoClient {
  getQuestion(userId: string, difficulty?: 'easy' | 'medium' | 'hard'): Promise<EchoQuestion>;
  verifyAnswer(verification: EchoAnswerVerification): Promise<boolean>;
}

/**
 * Echo API client for server-side operations
 * Now uses LLM-powered question generation via x402 payments
 */
export const echoClient: EchoClient = {
  async getQuestion(userId: string, difficulty: 'easy' | 'medium' | 'hard' = 'easy'): Promise<EchoQuestion> {
    const cache = getQuestionCache();

    try {
      // Use LLM to generate questions via x402 payments
      const generator = getQuestionGenerator();
      const question = await generator.generateQuestion(userId, difficulty);

      // Extract and store the correct answer in cache
      const meta = (question as any)._meta;
      if (meta && meta.correctAnswer) {
        cache.store(question, meta.correctAnswer);
        console.log('[EchoClient] Stored question in cache:', question.id);
      }

      // Remove metadata before returning (don't send correct answer to client!)
      const { _meta, ...cleanQuestion } = question as any;

      console.log('[EchoClient] Generated LLM question:', cleanQuestion.id);
      return cleanQuestion;
    } catch (error) {
      console.error('[EchoClient] LLM question generation failed:', error);

      // Fallback to mock if LLM fails (e.g., missing credentials)
      console.warn('[EchoClient] Falling back to mock question');
      const mockQuestion = {
        id: `mock_${Date.now()}`,
        question: 'What is the capital of France? (Mock fallback - set up CDP credentials)',
        options: ['London', 'Paris', 'Berlin', 'Madrid'],
        difficulty: 'easy' as const,
      };

      // Store mock answer in cache
      cache.store(mockQuestion, 'Paris');

      return mockQuestion;
    }
  },

  async verifyAnswer(verification: EchoAnswerVerification): Promise<boolean> {
    const cache = getQuestionCache();

    try {
      // Retrieve the question from cache
      const cached = cache.get(verification.questionId);
      if (!cached) {
        console.error('[EchoClient] Question not found in cache:', verification.questionId);
        return false;
      }

      // Verify the answer
      const isCorrect = verification.answer === cached.correctAnswer;

      console.log('[EchoClient] Answer verification:', {
        questionId: verification.questionId,
        userAnswer: verification.answer,
        isCorrect,
      });

      // Delete the question from cache after verification (one-time use)
      cache.delete(verification.questionId);

      return isCorrect;
    } catch (error) {
      console.error('[EchoClient] Answer verification failed:', error);
      return false;
    }
  },
};

/**
 * Client-side Echo auth helpers
 * Based on https://echo.merit.systems/docs/getting-started/react
 */
export const echoAuth = {
  getAuthUrl(): string {
    const appId = process.env.NEXT_PUBLIC_ECHO_APP_ID || '';
    const redirectUri = `${window.location.origin}/auth/callback`;
    return `https://echo.merit.systems/oauth/authorize?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
  },

  async handleCallback(code: string): Promise<{ userId: string; token: string }> {
    // TODO: Exchange code for token with Echo API
    // const response = await fetch('/api/auth/echo', {
    //   method: 'POST',
    //   body: JSON.stringify({ code }),
    // });
    // return response.json();

    // Mock implementation
    return {
      userId: `user_${Date.now()}`,
      token: `token_${code}`,
    };
  },
};
