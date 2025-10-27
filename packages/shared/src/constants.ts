// Chain IDs
export const CHAIN_IDS = {
  BASE_SEPOLIA: 84532,
  BASE_MAINNET: 8453,
  LOCALHOST: 31337,
} as const;

// Token configuration
export const TOKEN_DECIMALS = 18;
export const MINT_AMOUNT = '1000000000000000000'; // 1 token in wei

// Signature expiry (15 minutes)
export const SIGNATURE_VALIDITY_SECONDS = 15 * 60;

// API endpoints
export const API_ENDPOINTS = {
  GET_QUESTION: '/api/question',
  ANSWER_QUESTION: '/api/answer',
} as const;

// HTTP 402 Payment Required
export const QUESTION_MINT_FEE = '1000000000000000000'; // 1 POIC token as fee (in wei)

// Echo configuration
export const ECHO_CONFIG = {
  API_BASE_URL: 'https://api.echo.merit.systems',
  AUTH_URL: 'https://echo.merit.systems',
} as const;
