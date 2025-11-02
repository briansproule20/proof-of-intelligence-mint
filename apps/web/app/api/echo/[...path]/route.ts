import { handlers } from '@/lib/echo-sdk';

/**
 * Echo Authentication Handlers
 *
 * These routes handle Echo SDK authentication and session management.
 * Required for server-side AI model access via Echo.
 *
 * Pattern from: https://github.com/sragss/polymarketeer
 */
export const { GET, POST } = handlers;
