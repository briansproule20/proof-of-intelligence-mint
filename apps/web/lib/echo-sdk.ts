import Echo from '@merit-systems/echo-next-sdk';

/**
 * Echo SDK integration for x402-powered AI (Polymarketeer pattern)
 * Provides handlers for authentication and AI providers (OpenAI, Anthropic)
 *
 * This follows the simplified SDK approach from polymarketeer
 * See: https://github.com/sragss/polymarketeer/blob/main/src/echo/index.ts
 */
export const { handlers, isSignedIn, openai, anthropic } = Echo({
  appId: process.env.ECHO_APP_ID!,
});
