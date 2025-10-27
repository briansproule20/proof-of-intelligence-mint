import { EchoQuestion, EchoAnswerVerification } from '@poim/shared';

const ECHO_API_BASE = 'https://api.echo.merit.systems';
const ECHO_API_KEY = process.env.ECHO_API_KEY || '';

export interface EchoClient {
  getQuestion(userId: string): Promise<EchoQuestion>;
  verifyAnswer(verification: EchoAnswerVerification): Promise<boolean>;
}

/**
 * Echo API client for server-side operations
 * Note: This is a mock implementation. Replace with actual Echo API calls
 * based on Echo documentation at https://echo.merit.systems/docs
 */
export const echoClient: EchoClient = {
  async getQuestion(userId: string): Promise<EchoQuestion> {
    // TODO: Replace with actual Echo API call
    // const response = await fetch(`${ECHO_API_BASE}/questions/next`, {
    //   headers: {
    //     'Authorization': `Bearer ${ECHO_API_KEY}`,
    //     'Content-Type': 'application/json',
    //   },
    //   method: 'POST',
    //   body: JSON.stringify({ userId }),
    // });
    // return response.json();

    // Mock implementation for development
    return {
      id: `q_${Date.now()}`,
      question: 'What is the capital of France?',
      options: ['London', 'Paris', 'Berlin', 'Madrid'],
      difficulty: 'easy',
    };
  },

  async verifyAnswer(verification: EchoAnswerVerification): Promise<boolean> {
    // TODO: Replace with actual Echo API call
    // const response = await fetch(`${ECHO_API_BASE}/questions/verify`, {
    //   headers: {
    //     'Authorization': `Bearer ${ECHO_API_KEY}`,
    //     'Content-Type': 'application/json',
    //   },
    //   method: 'POST',
    //   body: JSON.stringify(verification),
    // });
    // const result = await response.json();
    // return result.correct === true;

    // Mock implementation for development (Paris is correct answer)
    return verification.answer === 'Paris';
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
